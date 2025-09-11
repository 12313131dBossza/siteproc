-- 🎯 TARGETED FIX - Update test expenses to be visible to API
-- Based on your browser console, the API works but returns 0 expenses

-- ============================================================================
-- STEP 1: CHECK PROFILES TABLE STRUCTURE
-- ============================================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: GET YOUR USER INFO (you're an admin)
-- ============================================================================
SELECT 'YOUR USER INFO:' as info,
       id as user_id,
       role,
       company_id
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================================
-- STEP 3: CHECK CURRENT TEST EXPENSES
-- ============================================================================
SELECT 'TEST EXPENSES STATUS:' as info,
       id,
       amount,
       status,
       description,
       user_id,
       company_id,
       memo
FROM expenses 
WHERE description LIKE 'WORKING TEST%'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 4: FIND ANY ADMIN USER TO ASSIGN EXPENSES TO
-- ============================================================================
-- Get the first admin user's details
WITH admin_user AS (
  SELECT id, company_id 
  FROM profiles 
  WHERE role IN ('admin', 'owner') 
  LIMIT 1
)
SELECT 'ADMIN USER TO USE:' as info,
       admin_user.id as admin_user_id,
       admin_user.company_id as admin_company_id
FROM admin_user;

-- ============================================================================
-- STEP 5: UPDATE TEST EXPENSES (EXECUTE THIS AFTER CHECKING ABOVE)
-- ============================================================================
-- This will assign the test expenses to the first admin user
WITH admin_user AS (
  SELECT id, company_id 
  FROM profiles 
  WHERE role IN ('admin', 'owner') 
  LIMIT 1
)
UPDATE expenses 
SET 
  status = 'approved',
  user_id = (SELECT id FROM admin_user),
  company_id = (SELECT company_id FROM admin_user),
  memo = COALESCE(memo, description)
WHERE description LIKE 'WORKING TEST%'
RETURNING id, amount, status, user_id, company_id, memo;

-- ============================================================================
-- STEP 6: VERIFY THE FIX
-- ============================================================================
SELECT 'FIXED EXPENSES:' as info,
       e.id,
       e.amount,
       e.status,
       e.memo,
       e.user_id,
       e.company_id,
       p.role as owner_role
FROM expenses e
JOIN profiles p ON e.user_id = p.id
WHERE e.description LIKE 'WORKING TEST%' OR e.memo LIKE 'WORKING TEST%'
ORDER BY e.created_at DESC;
