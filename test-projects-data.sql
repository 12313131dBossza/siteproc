-- 📊 PROJECTS MODULE TESTING - DATABASE QUERIES
-- Run these in your Supabase SQL editor to prepare test data

-- ============================================================================
-- 1. CHECK CURRENT DATA AVAILABILITY
-- ============================================================================

-- Check what data you have available for testing
-- First, let's see what columns exist in orders table
SELECT 
  'orders' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) as unassigned,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as assigned_to_projects
FROM orders

UNION ALL

SELECT 
  'expenses' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) as unassigned,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as assigned_to_projects
FROM expenses

UNION ALL

SELECT 
  'deliveries' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) as unassigned,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as assigned_to_projects
FROM deliveries

UNION ALL

SELECT 
  'projects' as table_name,
  COUNT(*) as total_records,
  0 as unassigned,
  0 as assigned_to_projects
FROM projects;

-- ============================================================================
-- 2. GET SAMPLE TEST DATA
-- ============================================================================

-- Get orders available for testing (unassigned preferred)
SELECT 
  id,
  project_id
FROM orders 
ORDER BY project_id IS NULL DESC, created_at DESC
LIMIT 10;

-- Get expenses available for testing (unassigned preferred)
SELECT 
  id,
  amount,
  status,
  project_id
FROM expenses 
ORDER BY project_id IS NULL DESC, created_at DESC
LIMIT 10;

-- Get deliveries available for testing (unassigned preferred)  
SELECT 
  id,
  project_id
FROM deliveries 
ORDER BY project_id IS NULL DESC, created_at DESC
LIMIT 10;

-- Get your projects for testing
SELECT 
  id,
  name,
  budget,
  status
FROM projects 
ORDER BY created_at DESC;

-- ============================================================================
-- 3. CREATE TEST DATA IF NEEDED
-- ============================================================================

-- First run check-schema.sql to see what columns exist in your tables
-- Then uncomment and modify these queries based on your actual schema:

/*
-- Example: Create sample orders (modify columns based on your schema)
INSERT INTO orders (column1, column2, status) 
VALUES 
('Test Order 1', 'pending', 'pending'),
('Test Order 2', 'pending', 'pending'),
('Test Order 3', 'pending', 'pending');

-- Example: Create sample expenses (modify columns based on your schema)
INSERT INTO expenses (description, amount, status) 
VALUES 
('Test Expense 1', 100.00, 'approved'),
('Test Expense 2', 250.50, 'approved'),
('Test Expense 3', 75.25, 'pending');

-- Example: Create sample deliveries (modify columns based on your schema)
INSERT INTO deliveries (status) 
VALUES 
('pending'),
('pending'),
('pending');
*/

-- ============================================================================
-- 4. VALIDATION QUERIES (Run AFTER testing)
-- ============================================================================

-- Verify project rollup calculations are correct
SELECT 
  p.id,
  p.name,
  p.budget,
  
  -- Calculate actual expenses (should match API)
  COALESCE(
    (SELECT SUM(amount) 
     FROM expenses 
     WHERE project_id = p.id 
     AND status = 'approved'), 
    0
  ) as actual_expenses,
  
  -- Calculate variance (should match API)
  p.budget - COALESCE(
    (SELECT SUM(amount) 
     FROM expenses 
     WHERE project_id = p.id 
     AND status = 'approved'), 
    0
  ) as variance,
  
  -- Count orders (should match API)
  (SELECT COUNT(*) FROM orders WHERE project_id = p.id) as order_count,
  
  -- Count expenses (should match API)  
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as expense_count,
  
  -- Count deliveries (should match API)
  (SELECT COUNT(*) FROM deliveries WHERE project_id = p.id) as delivery_count
  
FROM projects p
ORDER BY p.created_at DESC;

-- Check for data integrity issues
SELECT 
  'Orphaned Orders' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as affected_ids
FROM orders 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects)

UNION ALL

SELECT 
  'Orphaned Expenses' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as affected_ids
FROM expenses 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects)

UNION ALL

SELECT 
  'Orphaned Deliveries' as issue_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as affected_ids
FROM deliveries 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects);

-- ============================================================================
-- 5. CLEANUP QUERIES (Run AFTER testing if needed)
-- ============================================================================

-- Remove test data (CAREFUL - only run if you want to clean up)
-- DELETE FROM orders WHERE title LIKE 'Test Order %';
-- DELETE FROM expenses WHERE description LIKE 'Test Expense %';  
-- DELETE FROM deliveries WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour';

-- Unassign all items from projects (CAREFUL - only for testing cleanup)
-- UPDATE orders SET project_id = NULL WHERE project_id IS NOT NULL;
-- UPDATE expenses SET project_id = NULL WHERE project_id IS NOT NULL;
-- UPDATE deliveries SET project_id = NULL WHERE project_id IS NOT NULL;
