-- ============================================================================
-- PHASE 4 VERIFICATION SCRIPT
-- Check Projects Module current state
-- ============================================================================

-- Step 1: Check projects table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- Step 2: Check for budget-related columns specifically
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('budget', 'actual_cost', 'variance', 'estimated_cost', 'total_cost')
ORDER BY ordinal_position;

-- Step 3: Check if projects have any deliveries linked
SELECT 
    p.id,
    p.name,
    COUNT(d.id) as delivery_count
FROM projects p
LEFT JOIN deliveries d ON d.project_id = p.id
GROUP BY p.id, p.name
LIMIT 10;

-- Step 4: Check if projects have any expenses linked
SELECT 
    p.id,
    p.name,
    COUNT(e.id) as expense_count
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id
GROUP BY p.id, p.name
LIMIT 10;

-- Step 5: Sample project data
SELECT 
    id,
    name,
    status,
    start_date,
    end_date
FROM projects
ORDER BY created_at DESC
LIMIT 5;
