-- 🚨 FIX: Profile Not Found Issue
-- Your auth user exists but profile record is missing

-- Step 1: Check if profile exists
SELECT 
  '=== CHECK PROFILE ===' as section,
  COUNT(*) as profile_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ Profile missing - need to create it'
    ELSE '✅ Profile exists'
  END as status
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 2: Get your auth user ID
SELECT 
  '=== AUTH USERS ===' as section,
  id as auth_user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 3: Create profile if missing (using your auth user ID)
-- IMPORTANT: Replace 'YOUR-AUTH-ID-HERE' with the actual ID from Step 2

INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  company_id,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  'Yaibo Ndiseiei',  -- Update this to your actual name if different
  'owner',
  c.id,  -- Link to your company
  NOW(),
  NOW()
FROM auth.users au
CROSS JOIN companies c
WHERE au.email = 'yaibondiseiei@gmail.com'
  AND c.name = 'My Construction Company'
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE email = 'yaibondiseiei@gmail.com'
  );

-- Step 4: Verify profile was created
SELECT 
  '=== VERIFY PROFILE ===' as section,
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.company_id,
  c.name as company_name,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Profile exists and linked to company'
    ELSE '❌ Still missing'
  END as status
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.email = 'yaibondiseiei@gmail.com';

-- Step 5: Verify you can now access orders
SELECT 
  '=== TEST ACCESS ===' as section,
  COUNT(*) as visible_orders,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Can see orders now!'
    ELSE '❌ Still cant see orders'
  END as result
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.email = 'yaibondiseiei@gmail.com';
