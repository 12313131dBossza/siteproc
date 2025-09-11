-- 🚀 ULTRA SIMPLE PROJECT TESTING - GUARANTEED TO WORK
-- Run each section one by one in Supabase SQL Editor

-- ============================================================================
-- STEP 1: CREATE PRODUCTS FIRST
-- ============================================================================
INSERT INTO products (name, sku, category, price, stock, unit) VALUES 
('Test Material A', 'TMA-001', 'materials', 100.00, 50, 'kg'),
('Test Equipment B', 'TEB-002', 'equipment', 500.00, 10, 'unit'),
('Test Supply C', 'TSC-003', 'supplies', 25.00, 100, 'box');

-- ============================================================================
-- STEP 2: CREATE EXPENSES (SIMPLE VERSION)
-- ============================================================================
INSERT INTO expenses (amount, status, description, spent_at) VALUES 
(1200.00, 'approved', 'Material Supply Test', now()),
(850.50, 'approved', 'Equipment Rental', now()),
(300.75, 'pending', 'Office Supplies', now()),
(2500.00, 'approved', 'Contractor Payment', now()),
(150.00, 'rejected', 'Rejected Expense', now());

-- ============================================================================
-- STEP 3: CHECK WHAT WE HAVE SO FAR
-- ============================================================================
SELECT 'PRODUCTS CREATED:' as info, COUNT(*) as count FROM products;
SELECT 'EXPENSES CREATED:' as info, COUNT(*) as count FROM expenses;

-- ============================================================================
-- STEP 4: GET TEST DATA FOR MANUAL ASSIGNMENT
-- ============================================================================

-- Get expense IDs for testing
SELECT 'EXPENSES TO TEST WITH:' as info, id, amount, status, description
FROM expenses 
WHERE description LIKE '%Test%'
ORDER BY created_at DESC 
LIMIT 5;

-- Get your test project info
SELECT 'YOUR TEST PROJECT:' as info, id, name, budget, status
FROM projects 
WHERE id = '96abb85f-5920-4ce9-9966-90411a660aac';

-- ============================================================================
-- READY FOR TESTING!
-- ============================================================================
-- Now you can:
-- 1. Copy the expense IDs from above
-- 2. Go to your Vercel app: https://your-app.vercel.app/projects/96abb85f-5920-4ce9-9966-90411a660aac
-- 3. Test assigning expenses to the project
-- 4. Verify budget calculations update automatically
