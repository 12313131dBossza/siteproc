-- 🔍 CHECK AUTH vs PROFILE ID MISMATCH

-- Your auth user ID from session
SELECT 
  '=== AUTH USER ===' as section,
  id as auth_user_id,
  email
FROM auth.users
WHERE email = 'yaibondiseiei@gmail.com';

-- Your profile ID from test
SELECT 
  '=== PROFILE ===' as section,
  id as profile_id,
  email,
  company_id,
  role
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- THE CRITICAL CHECK: Do the IDs match?
SELECT 
  '=== ID MATCH CHECK ===' as section,
  au.id as auth_id,
  p.id as profile_id,
  au.email,
  CASE 
    WHEN au.id = p.id THEN '✅ IDs MATCH - Session should work'
    ELSE '❌ ID MISMATCH - This is the problem!'
  END as diagnosis,
  CASE 
    WHEN au.id = p.id THEN 'All good!'
    ELSE 'FIX: Update profile.id to match auth.users.id: ' || au.id::text
  END as fix
FROM auth.users au
CROSS JOIN profiles p
WHERE au.email = 'yaibondiseiei@gmail.com'
  AND p.email = 'yaibondiseiei@gmail.com';
