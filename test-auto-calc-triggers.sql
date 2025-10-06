-- Quick Test Queries for Phase 1C Auto-Calc Triggers
-- Run these AFTER installing create-project-auto-calc-triggers.sql

-- ============================================================================
-- STEP 1: Verify Installation
-- ============================================================================

-- Check columns exist
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('actual_expenses', 'variance', 'budget')
ORDER BY ordinal_position;
-- Expected: 3 rows showing budget, actual_expenses, variance

-- Check triggers exist
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name IN ('expenses_update_project_trigger', 'projects_budget_change_trigger');
-- Expected: 2 rows showing both triggers

-- ============================================================================
-- STEP 2: View Current State
-- ============================================================================

-- See all projects with their budget calculations
SELECT 
    id,
    name,
    budget,
    actual_expenses,
    variance,
    CASE 
        WHEN budget > 0 THEN ROUND((actual_expenses / budget * 100)::numeric, 1)
        ELSE 0
    END as percent_spent,
    CASE
        WHEN variance < 0 THEN '❌ OVER BUDGET'
        WHEN variance = 0 THEN '✅ EXACT'
        ELSE '✅ UNDER BUDGET'
    END as status
FROM projects
ORDER BY created_at DESC;

-- Count approved expenses per project
SELECT 
    p.id,
    p.name,
    p.budget,
    p.actual_expenses,
    COUNT(e.id) as approved_expense_count,
    COALESCE(SUM(e.amount), 0) as manual_sum
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.status = 'approved'
GROUP BY p.id, p.name, p.budget, p.actual_expenses;
-- actual_expenses should match manual_sum

-- ============================================================================
-- STEP 3: Test Trigger - Approve an Expense
-- ============================================================================

-- Find a project with a pending expense
SELECT 
    e.id as expense_id,
    e.amount,
    e.status,
    e.project_id,
    p.name as project_name,
    p.actual_expenses as current_actual
FROM expenses e
JOIN projects p ON p.id = e.project_id
WHERE e.status != 'approved'
LIMIT 1;

-- COPY the expense_id and project_id from above, then:

-- Before: Check project current state
SELECT id, name, budget, actual_expenses, variance 
FROM projects 
WHERE id = '<PASTE_PROJECT_ID_HERE>';

-- Approve the expense (this will trigger the auto-calc!)
UPDATE expenses 
SET status = 'approved' 
WHERE id = '<PASTE_EXPENSE_ID_HERE>'
RETURNING id, amount, project_id;

-- After: Check project updated automatically
SELECT id, name, budget, actual_expenses, variance 
FROM projects 
WHERE id = '<PASTE_PROJECT_ID_HERE>';
-- actual_expenses should have increased by the expense amount!

-- ============================================================================
-- STEP 4: Test Trigger - Change Expense Amount
-- ============================================================================

-- Find an approved expense
SELECT id, amount, status, project_id
FROM expenses 
WHERE status = 'approved'
LIMIT 1;

-- Before: Check project
SELECT id, name, actual_expenses FROM projects WHERE id = '<PROJECT_ID>';

-- Change the amount (add $100)
UPDATE expenses 
SET amount = amount + 100
WHERE id = '<EXPENSE_ID>' AND status = 'approved'
RETURNING id, amount, project_id;

-- After: Check project updated
SELECT id, name, actual_expenses FROM projects WHERE id = '<PROJECT_ID>';
-- actual_expenses should have increased by $100!

-- ============================================================================
-- STEP 5: Test Trigger - Unapprove an Expense
-- ============================================================================

-- Unapprove an expense
UPDATE expenses 
SET status = 'pending'
WHERE status = 'approved'
LIMIT 1
RETURNING id, amount, project_id;

-- Check project decreased
SELECT id, name, actual_expenses FROM projects WHERE id = '<RETURNED_PROJECT_ID>';
-- actual_expenses should have decreased!

-- ============================================================================
-- STEP 6: Test Trigger - Change Budget
-- ============================================================================

-- Before: Check project
SELECT id, name, budget, actual_expenses, variance FROM projects LIMIT 1;

-- Change budget
UPDATE projects 
SET budget = budget + 1000
WHERE id = '<PROJECT_ID>'
RETURNING id, budget, variance;
-- variance should have increased by $1000 immediately!

-- ============================================================================
-- STEP 7: Manual Recalculation (if needed)
-- ============================================================================

-- If data looks wrong, recalculate a specific project:
SELECT recalculate_project_totals('<PROJECT_ID>');

-- Or recalculate ALL projects:
DO $$
DECLARE
    v_project RECORD;
BEGIN
    FOR v_project IN SELECT id FROM projects LOOP
        PERFORM recalculate_project_totals(v_project.id);
    END LOOP;
    RAISE NOTICE 'All projects recalculated!';
END $$;

-- ============================================================================
-- STEP 8: Monitoring Query
-- ============================================================================

-- Use this to monitor budget health across all projects
SELECT 
    p.name,
    p.budget as budgeted,
    p.actual_expenses as spent,
    p.variance as remaining,
    CASE 
        WHEN p.budget > 0 
        THEN ROUND((p.actual_expenses / p.budget * 100)::numeric, 1) 
        ELSE 0 
    END as percent_used,
    COUNT(e.id) as approved_expenses,
    CASE
        WHEN p.variance < 0 THEN '🚨 OVER'
        WHEN p.variance < (p.budget * 0.2) THEN '⚠️  LOW'
        ELSE '✅ GOOD'
    END as health_status
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.status = 'approved'
GROUP BY p.id, p.name, p.budget, p.actual_expenses, p.variance
ORDER BY 
    CASE 
        WHEN p.variance < 0 THEN 1
        WHEN p.variance < (p.budget * 0.2) THEN 2
        ELSE 3
    END,
    p.actual_expenses DESC;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- Check if triggers are enabled
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('expenses', 'projects')
ORDER BY trigger_name;

-- Check for any projects with NULL values
SELECT 
    id, 
    name, 
    budget,
    actual_expenses,
    variance
FROM projects
WHERE actual_expenses IS NULL OR variance IS NULL;
-- If any found, run: SELECT recalculate_project_totals(id) FROM projects WHERE actual_expenses IS NULL;

-- Verify function exists
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosrc as source_code_length
FROM pg_proc
WHERE proname LIKE '%project%total%';

-- Check recent expenses activity
SELECT 
    e.id,
    e.amount,
    e.status,
    e.created_at,
    p.name as project_name,
    p.actual_expenses
FROM expenses e
JOIN projects p ON p.id = e.project_id
ORDER BY e.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS INDICATORS
-- ============================================================================

-- All tests passed if:
-- ✅ Columns exist (actual_expenses, variance)
-- ✅ Triggers exist and are enabled
-- ✅ Approving expense increases actual_expenses
-- ✅ Unapproving expense decreases actual_expenses
-- ✅ Changing amount updates actual_expenses
-- ✅ Changing budget updates variance
-- ✅ actual_expenses matches manual sum of approved expenses
-- ✅ variance = budget - actual_expenses (always)
