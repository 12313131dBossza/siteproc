-- 🔧 FIRST: Get your actual user ID
-- Run this to see your real user ID

SELECT 
  'Your User ID:' as info,
  auth.uid() as user_id,
  id as profile_id,
  company_id,
  role,
  full_name
FROM profiles
WHERE id = auth.uid();

-- Also check if you're actually logged in
SELECT 
  'Auth Check:' as info,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT LOGGED IN!'
    WHEN auth.uid() = '00000000-0000-4000-8000-000000000001' THEN '⚠️  Anonymous user - please log in properly'
    ELSE '✅ Logged in'
  END as status,
  auth.uid() as your_user_id;
