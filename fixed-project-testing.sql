-- 🚀 FIXED PROJECT TESTING - WITH PROPER USER/COMPANY SCOPE
-- This version ensures expenses are visible to your user and company

-- ============================================================================
-- STEP 1: GET CURRENT USER & COMPANY INFO
-- ============================================================================
-- First check what user and company you're logged in as
SELECT 'CURRENT USER:' as info, auth.uid() as user_id;

-- Check your profile/company association
SELECT 'YOUR PROFILE:' as info, id, company_id, role 
FROM profiles 
WHERE id = auth.uid();

-- ============================================================================
-- STEP 2: CREATE EXPENSES WITH PROPER SCOPE
-- ============================================================================
-- Create expenses that belong to your user and company
WITH user_info AS (
  SELECT auth.uid() as user_id, company_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1
)
INSERT INTO expenses (amount, status, description, spent_at, created_by, company_id) 
SELECT 
  1200.00, 'approved', 'API Test - Material Supply', now(), user_id, company_id
FROM user_info
UNION ALL
SELECT 
  850.50, 'approved', 'API Test - Equipment Rental', now(), user_id, company_id
FROM user_info
UNION ALL
SELECT 
  300.75, 'pending', 'API Test - Office Supplies', now(), user_id, company_id
FROM user_info;

-- ============================================================================
-- STEP 3: VERIFY EXPENSES ARE VISIBLE TO API
-- ============================================================================
-- Check expenses are created with proper user/company scope
SELECT 'TEST EXPENSES:' as info, id, amount, description, created_by, company_id
FROM expenses 
WHERE description LIKE 'API Test%'
AND created_by = auth.uid()
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 4: TEST THE API ENDPOINT DIRECTLY
-- ============================================================================
-- Check if expenses are accessible via the same scope as your web app
SELECT 'EXPENSES FOR API:' as info, 
       COUNT(*) as total_count,
       COUNT(CASE WHEN project_id IS NULL THEN 1 END) as unassigned_count
FROM expenses 
WHERE created_by = auth.uid();

-- ============================================================================
-- READY FOR TESTING!
-- ============================================================================
-- Now go back to your Vercel app and:
-- 1. Refresh the page
-- 2. The expenses should now appear in the bulk assignment interface
-- 3. Use the IDs from STEP 3 results for testing
