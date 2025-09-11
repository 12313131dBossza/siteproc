-- 🛠️ FIX TEST EXPENSES FOR API ACCESS
-- This updates the test expenses to be visible to your current user

-- ============================================================================
-- STEP 1: GET YOUR CURRENT USER ID FROM PROFILES
-- ============================================================================
SELECT 'CURRENT USER INFO:' as info,
       id as user_id,
       role,
       company_id
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 2: UPDATE TEST EXPENSES TO BE OWNED BY YOUR USER
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from step 1
-- ============================================================================

-- First, let's see what test expenses exist
SELECT 'CURRENT TEST EXPENSES:' as info,
       id,
       amount,
       status,
       description,
       user_id,
       company_id,
       created_at
FROM expenses 
WHERE description LIKE 'WORKING TEST%'
ORDER BY created_at DESC;

-- Update expenses to be approved and owned by your user
-- UNCOMMENT and replace USER_ID after checking step 1:

-- UPDATE expenses 
-- SET 
--   status = 'approved',
--   user_id = 'YOUR_USER_ID_HERE',
--   company_id = (SELECT company_id FROM profiles WHERE id = 'YOUR_USER_ID_HERE'),
--   memo = description
-- WHERE description LIKE 'WORKING TEST%';

-- ============================================================================
-- STEP 3: VERIFY UPDATES
-- ============================================================================
SELECT 'UPDATED TEST EXPENSES:' as info,
       id,
       amount,
       status,
       memo,
       user_id,
       company_id
FROM expenses 
WHERE description LIKE 'WORKING TEST%' OR memo LIKE 'WORKING TEST%'
ORDER BY created_at DESC;
