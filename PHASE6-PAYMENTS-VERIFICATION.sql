-- ============================================================================
-- PHASE 6: PAYMENTS MODULE VERIFICATION & STATUS CHECK
-- Review current state of payment tracking system
-- ============================================================================

-- 1. Check payments table schema
SELECT 
    '=== PAYMENTS TABLE SCHEMA ===' as check_section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'company_id', 'project_id', 'vendor_name', 'amount', 'payment_date', 'payment_method', 'status', 'created_by', 'created_at') 
        THEN '✅ CORE'
        ELSE '📋 OPTIONAL'
    END as importance
FROM information_schema.columns 
WHERE table_name = 'payments' 
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
  AND tc.table_name = 'payments'
  AND tc.table_schema = 'public';

-- 3. Check triggers on payments table
SELECT 
    '=== PAYMENT TRIGGERS ===' as check_section;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 4. Check indexes for performance
SELECT 
    '=== PAYMENT INDEXES ===' as check_section;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'payments'
  AND schemaname = 'public'
ORDER BY indexname;

-- 5. Check status constraint
SELECT 
    '=== STATUS CONSTRAINT ===' as check_section;

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payments'::regclass
  AND contype = 'c'
  AND conname LIKE '%status%';

-- 6. Sample payment data with linkages
SELECT 
    '=== SAMPLE PAYMENTS WITH LINKAGES ===' as check_section;

SELECT 
    pm.id,
    pm.vendor_name,
    pm.amount,
    pm.payment_method,
    pm.payment_date,
    pm.status,
    pm.created_at,
    pr.name AS project_name,
    CASE 
        WHEN pm.project_id IS NOT NULL THEN '✅ Linked to Project'
        WHEN pm.order_id IS NOT NULL THEN '✅ Linked to Order'
        WHEN pm.expense_id IS NOT NULL THEN '✅ Linked to Expense'
        ELSE '❌ No Linkage'
    END as linkage_status,
    CASE 
        WHEN pm.reference_number IS NOT NULL THEN '✅ Has Reference'
        ELSE '❌ No Reference'
    END as reference_status
FROM payments pm
LEFT JOIN projects pr ON pr.id = pm.project_id
ORDER BY pm.created_at DESC
LIMIT 10;

-- 7. Payment summary by status
SELECT 
    '=== PAYMENTS BY STATUS ===' as check_section;

SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM payments
GROUP BY status
ORDER BY status;

-- 8. Payment summary by method
SELECT 
    '=== PAYMENTS BY METHOD ===' as check_section;

SELECT 
    payment_method,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM payments
WHERE payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY total_amount DESC;

-- 9. Payments linked to projects
SELECT 
    '=== PAYMENTS BY PROJECT ===' as check_section;

SELECT 
    p.name AS project_name,
    p.code AS project_code,
    COUNT(pm.id) as payment_count,
    COALESCE(SUM(pm.amount), 0) as total_payments,
    COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'paid'), 0) as paid_amount,
    COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'unpaid'), 0) as unpaid_amount,
    CASE 
        WHEN COUNT(pm.id) FILTER (WHERE pm.status = 'unpaid') > 0 THEN '⚠️ Has Unpaid'
        ELSE '✅ All Paid'
    END as payment_status
FROM projects p
LEFT JOIN payments pm ON pm.project_id = p.id
GROUP BY p.id, p.name, p.code
HAVING COUNT(pm.id) > 0
ORDER BY total_payments DESC
LIMIT 10;

-- 10. Recent payment activity
SELECT 
    '=== RECENT PAYMENT ACTIVITY ===' as check_section;

SELECT 
    pm.id,
    pm.vendor_name,
    pm.amount,
    pm.payment_method,
    pm.status,
    pm.payment_date,
    pm.created_at,
    pm.updated_at,
    CASE 
        WHEN pm.status = 'paid' THEN 'Paid'
        WHEN pm.status = 'pending' THEN 'Pending'
        WHEN pm.status = 'unpaid' THEN 'Unpaid'
        WHEN pm.status = 'cancelled' THEN 'Cancelled'
        ELSE 'Unknown'
    END as payment_info
FROM payments pm
ORDER BY COALESCE(pm.updated_at, pm.created_at) DESC
LIMIT 15;

-- ============================================================================
-- FEATURE CHECKLIST
-- ============================================================================

SELECT 
    '=== PHASE 6 FEATURE CHECKLIST ===' as check_section;

SELECT 
    '✅ Payments table exists' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Project linkage (project_id)' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'project_id') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Order linkage (order_id)' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'order_id') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Expense linkage (expense_id)' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'expense_id') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Payment status workflow' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'status') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Approved by tracking' as feature,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'approved_by') 
        THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Status constraint' as feature,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'payments'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%status%'
    ) THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    '✅ Updated timestamp trigger' as feature,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'payments' 
        AND trigger_name LIKE '%updated_at%'
    ) THEN 'PASS' ELSE 'FAIL' END as status;

-- ============================================================================
-- LINKAGE ANALYSIS
-- ============================================================================

SELECT 
    '=== PAYMENT LINKAGE ANALYSIS ===' as check_section;

SELECT 
    'Total Payments' as metric,
    COUNT(*) as count,
    ROUND(100.0, 2) as percentage
FROM payments
UNION ALL
SELECT 
    'Linked to Projects' as metric,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM payments), 0), 2) as percentage
FROM payments
WHERE project_id IS NOT NULL
UNION ALL
SELECT 
    'Linked to Orders' as metric,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM payments), 0), 2) as percentage
FROM payments
WHERE order_id IS NOT NULL
UNION ALL
SELECT 
    'Linked to Expenses' as metric,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM payments), 0), 2) as percentage
FROM payments
WHERE expense_id IS NOT NULL
UNION ALL
SELECT 
    'No Linkage' as metric,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM payments), 0), 2) as percentage
FROM payments
WHERE project_id IS NULL AND order_id IS NULL AND expense_id IS NULL;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

SELECT 
    '=== PHASE 6 RECOMMENDATIONS ===' as check_section;

-- Check for payments without references
SELECT 
    '📄 Reference Numbers' as recommendation,
    CONCAT(
        COUNT(CASE WHEN reference_number IS NULL THEN 1 END), 
        ' of ', 
        COUNT(*), 
        ' payments missing reference numbers'
    ) as details
FROM payments
UNION ALL
-- Check for unpaid payments
SELECT 
    '💵 Unpaid Payments' as recommendation,
    CONCAT(COUNT(*), ' payments awaiting payment') as details
FROM payments
WHERE status = 'unpaid'
UNION ALL
-- Check for payments without project linkage
SELECT 
    '🔗 Project Linkage' as recommendation,
    CONCAT(COUNT(*), ' payments not linked to projects, orders, or expenses') as details
FROM payments
WHERE project_id IS NULL AND order_id IS NULL AND expense_id IS NULL;

-- ============================================================================
-- PAYMENT METHOD DISTRIBUTION
-- ============================================================================

SELECT 
    '=== PAYMENT METHOD DISTRIBUTION ===' as check_section;

SELECT 
    COALESCE(payment_method, 'Not Specified') as payment_method,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM payments), 0), 2) as percentage
FROM payments
GROUP BY payment_method
ORDER BY count DESC;

-- ============================================================================
-- END OF VERIFICATION
-- ============================================================================

SELECT '✅ Phase 6 Verification Complete' as status;
