-- 🔧 SIMPLE COMPANY ID FIX
-- Fix the company_id mismatch with basic SQL

-- ============================================================================
-- STEP 1: CHECK CURRENT ADMIN USER
-- ============================================================================
SELECT 'CURRENT ADMIN USER:' as info,
       id,
       role,
       company_id
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 2: CHECK TEST EXPENSES
-- ============================================================================
SELECT 'TEST EXPENSES:' as info,
       id,
       amount,
       company_id,
       user_id
FROM expenses 
WHERE description LIKE 'WORKING TEST%' OR memo LIKE 'WORKING TEST%'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3: SIMPLE FIX - UPDATE EXPENSES TO MATCH ADMIN USER
-- ============================================================================
-- Get the admin user's company_id and update expenses
UPDATE expenses 
SET 
  company_id = (
    SELECT company_id 
    FROM profiles 
    WHERE role = 'admin' 
    ORDER BY created_at DESC 
    LIMIT 1
  ),
  user_id = (
    SELECT id 
    FROM profiles 
    WHERE role = 'admin' 
    ORDER BY created_at DESC 
    LIMIT 1
  )
WHERE description LIKE 'WORKING TEST%' OR memo LIKE 'WORKING TEST%';

-- ============================================================================
-- STEP 4: VERIFY THE FIX
-- ============================================================================
SELECT 'AFTER FIX:' as info,
       e.id,
       e.amount,
       e.company_id as expense_company,
       p.company_id as user_company,
       CASE 
         WHEN e.company_id = p.company_id THEN '✅ WILL SHOW'
         ELSE '❌ STILL HIDDEN'
       END as status
FROM expenses e
JOIN profiles p ON p.role = 'admin'
WHERE e.description LIKE 'WORKING TEST%' OR e.memo LIKE 'WORKING TEST%'
ORDER BY e.created_at DESC;
