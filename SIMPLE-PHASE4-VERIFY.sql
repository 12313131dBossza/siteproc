-- ============================================================================
-- SIMPLE PHASE 4 VERIFICATION
-- Just check that the budget tracking columns and triggers exist
-- ============================================================================

-- 1. Verify projects table has new columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('actual_cost', 'variance', 'start_date', 'end_date', 'description', 'updated_at')
ORDER BY column_name;

-- 2. Verify the calculation function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'calculate_project_actual_cost';

-- 3. Verify triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%project_cost%'
ORDER BY event_object_table, event_manipulation;

-- 4. Check current projects with budget data
SELECT 
    name,
    code,
    budget,
    actual_cost,
    variance,
    CASE 
        WHEN variance < 0 THEN '🔴 Over Budget'
        WHEN variance < (budget * 0.2) THEN '🟡 Warning'
        ELSE '🟢 On Track'
    END as status_indicator,
    status,
    created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- MANUAL TEST INSTRUCTIONS
-- ============================================================================

/*
TO TEST BUDGET TRACKING MANUALLY:

1. Go to your app UI: /projects
2. Create a new project:
   - Name: "Test Budget Project"
   - Budget: $10,000
   
3. Add an order to the project through the UI:
   - Go to the project detail page
   - Click "Add Order"
   - Fill in order details
   - Set delivered_value to $3,000
   
4. Check that actual_cost updates automatically:
   - Run this query:
   
   SELECT name, budget, actual_cost, variance 
   FROM projects 
   WHERE name = 'Test Budget Project';
   
   Expected: actual_cost should be $3,000, variance should be $7,000

5. Add an expense:
   - Click "Add Expense"
   - Amount: $2,500
   
6. Check again:
   
   SELECT name, budget, actual_cost, variance 
   FROM projects 
   WHERE name = 'Test Budget Project';
   
   Expected: actual_cost should be $5,500, variance should be $4,500

✅ If both work, budget tracking is fully functional!

*/
