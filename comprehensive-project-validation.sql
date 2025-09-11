-- 🎯 COMPREHENSIVE PROJECTS MODULE VALIDATION
-- This script will test all 4 critical areas you specified

-- ============================================================================
-- SETUP: Create test data for comprehensive validation
-- ============================================================================

-- 1. First, let's create test orders, expenses, and deliveries
-- (Uncomment and run these sections one by one)

-- Test Orders (modify based on your actual orders table schema)
INSERT INTO orders (status) VALUES 
('pending'),
('approved'),
('completed');

-- Test Expenses with different amounts and statuses  
INSERT INTO expenses (amount, status, description) VALUES 
(1200.00, 'approved', 'Material Supply Test'),
(850.50, 'approved', 'Equipment Rental'),
(300.75, 'pending', 'Office Supplies'),
(2500.00, 'approved', 'Contractor Payment'),
(150.00, 'rejected', 'Rejected Expense');

-- Test Deliveries
INSERT INTO deliveries (status) VALUES 
('pending'),
('in_progress'),
('completed');

-- ============================================================================
-- TEST 1: LINKING VALIDATION 
-- ============================================================================

-- Get IDs for testing (run this after creating test data)
SELECT 'ORDERS FOR TESTING' as section, id, status, project_id 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'EXPENSES FOR TESTING' as section, id, amount, status, project_id, description
FROM expenses 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'DELIVERIES FOR TESTING' as section, id, status, project_id
FROM deliveries 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- TEST 2: BUDGET CALCULATION VALIDATION
-- ============================================================================

-- Check project rollup calculations (run AFTER assigning items)
SELECT 
  p.id,
  p.name,
  p.budget,
  
  -- Only APPROVED expenses should count toward actual
  COALESCE(
    (SELECT SUM(amount) 
     FROM expenses 
     WHERE project_id = p.id 
     AND status = 'approved'), 
    0
  ) as actual_expenses,
  
  -- Variance = Budget - Actual
  p.budget - COALESCE(
    (SELECT SUM(amount) 
     FROM expenses 
     WHERE project_id = p.id 
     AND status = 'approved'), 
    0
  ) as variance,
  
  -- Counts
  (SELECT COUNT(*) FROM orders WHERE project_id = p.id) as order_count,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as expense_count,
  (SELECT COUNT(*) FROM deliveries WHERE project_id = p.id) as delivery_count
  
FROM projects p
WHERE p.id = '96abb85f-5920-4ce9-9966-90411a660aac';

-- ============================================================================
-- TEST 3: EDGE CASES VALIDATION
-- ============================================================================

-- Check for unassigned items (should exist)
SELECT 'UNASSIGNED ORDERS' as type, COUNT(*) as count
FROM orders 
WHERE project_id IS NULL

UNION ALL

SELECT 'UNASSIGNED EXPENSES' as type, COUNT(*) as count
FROM expenses 
WHERE project_id IS NULL

UNION ALL

SELECT 'UNASSIGNED DELIVERIES' as type, COUNT(*) as count
FROM deliveries 
WHERE project_id IS NULL;

-- Check for double assignment issues (should be empty)
SELECT 'POTENTIAL ISSUES' as section, 
       'Multiple Projects per Item' as issue_type,
       COUNT(*) as count
FROM (
  SELECT project_id, COUNT(*) as project_count
  FROM (
    SELECT id, project_id FROM orders WHERE project_id IS NOT NULL
    UNION ALL
    SELECT id, project_id FROM expenses WHERE project_id IS NOT NULL  
    UNION ALL
    SELECT id, project_id FROM deliveries WHERE project_id IS NOT NULL
  ) t
  GROUP BY id, project_id
  HAVING COUNT(*) > 1
) duplicates;

-- Check status-based calculations (only approved expenses should count)
SELECT 
  'EXPENSE STATUS BREAKDOWN' as section,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  CASE 
    WHEN status = 'approved' THEN 'COUNTS_TOWARD_ACTUAL'
    ELSE 'DOES_NOT_COUNT'
  END as actual_impact
FROM expenses 
GROUP BY status;

-- ============================================================================
-- TEST 4: DATA INTEGRITY CHECKS
-- ============================================================================

-- Verify no orphaned assignments
SELECT 'ORPHANED ASSIGNMENTS' as section,
       'Orders pointing to non-existent projects' as issue,
       COUNT(*) as count
FROM orders 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects)

UNION ALL

SELECT 'ORPHANED ASSIGNMENTS' as section,
       'Expenses pointing to non-existent projects' as issue,
       COUNT(*) as count
FROM expenses 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects)

UNION ALL

SELECT 'ORPHANED ASSIGNMENTS' as section,
       'Deliveries pointing to non-existent projects' as issue,
       COUNT(*) as count
FROM deliveries 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects);

-- ============================================================================
-- CLEANUP (Run AFTER testing if needed)
-- ============================================================================

-- Remove test data (CAREFUL - only run if you want to clean up)
/*
DELETE FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';
DELETE FROM expenses WHERE created_at > NOW() - INTERVAL '1 hour';
DELETE FROM deliveries WHERE created_at > NOW() - INTERVAL '1 hour';

-- Unassign all items from the test project
UPDATE orders SET project_id = NULL WHERE project_id = '96abb85f-5920-4ce9-9966-90411a660aac';
UPDATE expenses SET project_id = NULL WHERE project_id = '96abb85f-5920-4ce9-9966-90411a660aac';
UPDATE deliveries SET project_id = NULL WHERE project_id = '96abb85f-5920-4ce9-9966-90411a660aac';
*/
