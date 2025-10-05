-- 🧪 SIMPLE TEST: Check if API can see your data
-- Run this to verify the database has the right data

-- 1. What's your user ID?
SELECT auth.uid() as my_user_id;

-- 2. Do you have a profile with company?
SELECT 
  id as user_id,
  company_id,
  role,
  CASE WHEN company_id IS NOT NULL THEN '✅ HAS COMPANY' ELSE '❌ NO COMPANY' END as status
FROM profiles
WHERE id = auth.uid();

-- 3. What projects exist for your company?
SELECT 
  p.id,
  p.name,
  p.company_id,
  p.status,
  CASE 
    WHEN p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    THEN '✅ YOU CAN SEE THIS'
    ELSE '❌ WRONG COMPANY'
  END as visibility
FROM projects p
ORDER BY p.created_at DESC;

-- 4. Can the API see your projects? (This simulates what the API does)
SELECT 
  '=== WHAT THE API RETURNS ===' as section,
  p.*
FROM projects p
WHERE p.company_id = (
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid()
);
