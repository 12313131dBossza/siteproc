-- 🔧 COMPANY ID MISMATCH FIX
-- The expenses exist but aren't showing because of company_id mismatch

-- ============================================================================
-- STEP 1: CHECK YOUR CURRENT SESSION USER'S COMPANY
-- ============================================================================
-- Get the company_id of the user currently logged into Vercel
SELECT 'CURRENT SESSION USER:' as info,
       id,
       role,
       company_id,
       'This should match expense company_id' as note
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 2: CHECK EXPENSE COMPANY IDS
-- ============================================================================
SELECT 'EXPENSE COMPANY IDS:' as info,
       company_id as expense_company_id,
       COUNT(*) as expense_count
FROM expenses 
WHERE description LIKE 'WORKING TEST%' OR memo LIKE 'WORKING TEST%'
GROUP BY company_id;

-- ============================================================================
-- STEP 3: FIND THE MISMATCH
-- ============================================================================
WITH session_user AS (
  SELECT id, company_id as session_company_id
  FROM profiles 
  WHERE role = 'admin'
  ORDER BY created_at DESC
  LIMIT 1
),
expense_companies AS (
  SELECT DISTINCT company_id as expense_company_id
  FROM expenses 
  WHERE description LIKE 'WORKING TEST%' OR memo LIKE 'WORKING TEST%'
)
SELECT 
  'COMPANY MISMATCH CHECK:' as info,
  s.session_company_id,
  e.expense_company_id,
  CASE 
    WHEN s.session_company_id = e.expense_company_id THEN 'MATCH - Should work'
    ELSE 'MISMATCH - This is the problem!'
  END as diagnosis
FROM session_user s
CROSS JOIN expense_companies e;

-- ============================================================================
-- STEP 4: FIX THE MISMATCH
-- ============================================================================
-- Update all test expenses to use the current session user's company_id
WITH session_user AS (
  SELECT id, company_id 
  FROM profiles 
  WHERE role = 'admin'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE expenses 
SET 
  company_id = (SELECT company_id FROM session_user),
  user_id = (SELECT id FROM session_user)
WHERE description LIKE 'WORKING TEST%' OR memo LIKE 'WORKING TEST%'
RETURNING 
  id, 
  amount, 
  company_id, 
  user_id,
  'Fixed - should now appear in API' as status;

-- ============================================================================
-- STEP 5: VERIFY THE FIX
-- ============================================================================
WITH session_user AS (
  SELECT id, company_id 
  FROM profiles 
  WHERE role = 'admin'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 'VERIFICATION:' as info,
       e.id,
       e.amount,
       e.memo,
       e.company_id,
       e.user_id,
       s.company_id as session_company_id,
       CASE 
         WHEN e.company_id = s.company_id THEN '✅ WILL SHOW IN API'
         ELSE '❌ STILL HIDDEN'
       END as api_visibility
FROM expenses e
CROSS JOIN session_user s
WHERE e.description LIKE 'WORKING TEST%' OR e.memo LIKE 'WORKING TEST%'
ORDER BY e.created_at DESC;
