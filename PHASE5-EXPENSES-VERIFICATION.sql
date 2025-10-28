-- ============================================================================
-- PHASE 5: EXPENSES MODULE VERIFICATION & STATUS CHECK
-- Review current state of expense tracking system
-- ============================================================================

-- 1. Check expenses table schema
SELECT 
    '=== EXPENSES TABLE SCHEMA ===' as check_section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'company_id', 'project_id', 'user_id', 'vendor', 'category', 'amount', 'status', 'receipt_url', 'approved_by', 'approved_at', 'created_at') 
        THEN '✅ CORE'
        ELSE '📋 OPTIONAL'
    END as importance
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check foreign key relationships
SELECT 
    '=== FOREIGN KEY RELATIONSHIPS ===' as check_section;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'expenses'
  AND tc.table_schema = 'public';

-- 3. Check triggers on expenses table
SELECT 
    '=== EXPENSE TRIGGERS ===' as check_section;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'expenses'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 4. Check indexes for performance
SELECT 
    '=== EXPENSE INDEXES ===' as check_section;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'expenses'
  AND schemaname = 'public'
ORDER BY indexname;

-- 5. Check status constraint
SELECT 
    '=== STATUS CONSTRAINT ===' as check_section;

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'expenses'::regclass
  AND contype = 'c'
  AND conname LIKE '%status%';

-- 6. Sample expense data with project linkage
SELECT 
    '=== SAMPLE EXPENSES WITH PROJECT LINKAGE ===' as check_section;

SELECT 
    e.id,
    e.vendor,
    e.category,
    e.amount,
    e.status,
    e.created_at,
    p.name AS project_name,
    p.code AS project_code,
    CASE 
        WHEN e.receipt_url IS NOT NULL THEN '✅ Has Receipt'
        ELSE '❌ No Receipt'
    END as receipt_status,
    CASE 
        WHEN e.approved_by IS NOT NULL THEN '✅ Approved'
        WHEN e.status = 'rejected' THEN '❌ Rejected'
        ELSE '⏳ Pending'
    END as approval_status
FROM expenses e
LEFT JOIN projects p ON p.id = e.project_id
ORDER BY e.created_at DESC
LIMIT 10;

-- 7. Expense summary by status
SELECT 
    '=== EXPENSES BY STATUS ===' as check_section;

SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM expenses
GROUP BY status
ORDER BY status;

-- 8. Expense summary by category
SELECT 
    '=== EXPENSES BY CATEGORY ===' as check_section;

SELECT 
    category,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM expenses
WHERE category IS NOT NULL
GROUP BY category
ORDER BY total_amount DESC;

-- 9. Expenses linked to projects (budget impact)
SELECT 
    '=== PROJECT EXPENSE IMPACT ===' as check_section;

SELECT 
    p.name AS project_name,
    p.code AS project_code,
    p.budget,
    p.actual_cost,
    p.variance,
    COUNT(e.id) as expense_count,
    COALESCE(SUM(e.amount), 0) as total_expenses,
    CASE 
        WHEN p.variance < 0 THEN '🔴 Over Budget'
        WHEN p.variance < (p.budget * 0.2) THEN '🟡 Warning'
        ELSE '🟢 On Track'
    END as budget_status
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id
GROUP BY p.id, p.name, p.code, p.budget, p.actual_cost, p.variance
HAVING COUNT(e.id) > 0
ORDER BY total_expenses DESC
LIMIT 10;

-- 10. Recent expense activity
SELECT 
    '=== RECENT EXPENSE ACTIVITY ===' as check_section;

SELECT 
    e.id,
    e.vendor,
    e.amount,
    e.status,
    e.created_at,
    e.updated_at,
    CASE 
        WHEN e.approved_at IS NOT NULL THEN 
            CONCAT('Approved ', TO_CHAR(e.approved_at, 'MM/DD/YY'))
        WHEN e.status = 'rejected' THEN 
            'Rejected'
        ELSE 
            'Pending'
    END as approval_info
FROM expenses e
ORDER BY COALESCE(e.updated_at, e.created_at) DESC
LIMIT 15;

-- ============================================================================
-- FEATURE CHECKLIST
-- ============================================================================

SELECT 
    '=== PHASE 5 FEATURE CHECKLIST ===' as check_section;

SELECT 
    '✅ Expense table exists' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Project linkage (project_id)' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'project_id') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Budget auto-update trigger' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_project_cost_on_expense') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Receipt URL support' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'receipt_url') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Approval workflow (status)' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'status') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Approved by tracking' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'approved_by') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Status constraint' as feature,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'expenses'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%status%'
    ) THEN 'PASS' ELSE 'FAIL' END as status;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

SELECT 
    '=== PHASE 5 RECOMMENDATIONS ===' as check_section;

-- Check for expenses without receipts
SELECT 
    '📸 Receipt Upload Status' as recommendation,
    CONCAT(
        COUNT(CASE WHEN receipt_url IS NULL THEN 1 END), 
        ' of ', 
        COUNT(*), 
        ' expenses missing receipts'
    ) as details
FROM expenses
UNION ALL
-- Check for pending approvals
SELECT 
    '⏳ Pending Approvals' as recommendation,
    CONCAT(COUNT(*), ' expenses awaiting approval') as details
FROM expenses
WHERE status = 'pending'
UNION ALL
-- Check for expenses without project linkage
SELECT 
    '🔗 Project Linkage' as recommendation,
    CONCAT(COUNT(*), ' expenses not linked to projects') as details
FROM expenses
WHERE project_id IS NULL;

-- ============================================================================
-- END OF VERIFICATION
-- ============================================================================
