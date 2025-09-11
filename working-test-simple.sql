-- 🚀 SIMPLE WORKING TEST - NO COMPLEX COLUMNS
-- This will definitely work by using only existing columns

-- ============================================================================
-- STEP 1: CHECK WHAT COLUMNS EXPENSES TABLE ACTUALLY HAS
-- ============================================================================
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: CREATE SIMPLE EXPENSES (ONLY REQUIRED COLUMNS)
-- ============================================================================
INSERT INTO expenses (amount, status, description, spent_at) VALUES 
(1200.00, 'approved', 'WORKING TEST - Material Supply', now()),
(850.50, 'approved', 'WORKING TEST - Equipment Rental', now()),
(300.75, 'pending', 'WORKING TEST - Office Supplies', now());

-- ============================================================================
-- STEP 3: GET THE EXPENSE IDS 
-- ============================================================================
SELECT 'EXPENSE IDS FOR TESTING:' as info, 
       id, 
       amount, 
       description,
       CONCAT('Use this ID: ', id) as instruction
FROM expenses 
WHERE description LIKE 'WORKING TEST%'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 4: CHECK PROJECT EXISTS
-- ============================================================================
SELECT 'PROJECT STATUS:' as info, 
       id, 
       name, 
       budget,
       CASE 
         WHEN id IS NOT NULL THEN 'Project exists - ready for testing'
         ELSE 'Project not found'
       END as status
FROM projects 
WHERE id = '96abb85f-5920-4ce9-9966-90411a660aac';

-- ============================================================================
-- STEP 5: VERIFY NO RLS BLOCKING (CHECK TOTAL EXPENSES)
-- ============================================================================
SELECT 'TOTAL EXPENSES IN DB:' as info, COUNT(*) as count FROM expenses;
SELECT 'TEST EXPENSES CREATED:' as info, COUNT(*) as count FROM expenses WHERE description LIKE 'WORKING TEST%';
