-- 🚨 FIX AUTH/PROFILE ID MISMATCH
-- This will update the profile ID to match your auth user ID

-- Step 1: Delete the old profile (wrong ID)
DELETE FROM profiles
WHERE id = 'f34e5416-505a-42b3-a9af-74330c91e05b'
  AND email = 'yaibondiseiei@gmail.com';

-- Step 2: Create new profile with CORRECT auth ID
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  company_id,
  created_at,
  updated_at
)
VALUES (
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8',  -- YOUR ACTUAL AUTH ID
  'yaibondiseiei@gmail.com',
  'Yaibo Ndiseiei',
  'admin',
  'e39d2f43-c0b7-4d87-bc88-9979448447c8',  -- Your company ID
  NOW(),
  NOW()
);

-- Step 3: Update ALL purchase orders to use correct user ID
UPDATE purchase_orders
SET requested_by = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'
WHERE requested_by = 'f34e5416-505a-42b3-a9af-74330c91e05b';

-- Step 4: Update project created_by
UPDATE projects
SET created_by = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'
WHERE created_by = 'f34e5416-505a-42b3-a9af-74330c91e05b';

-- VERIFICATION
SELECT 
  '✅ PROFILE FIXED' as section,
  p.id as profile_id,
  au.id as auth_id,
  p.email,
  p.company_id,
  p.role,
  CASE 
    WHEN p.id = au.id THEN '✅ IDs NOW MATCH!'
    ELSE '❌ Still broken'
  END as status
FROM profiles p
INNER JOIN auth.users au ON au.email = p.email
WHERE p.email = 'yaibondiseiei@gmail.com';

SELECT 
  '✅ ORDERS UPDATED' as section,
  COUNT(*) as total_orders,
  requested_by
FROM purchase_orders
WHERE requested_by = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'
GROUP BY requested_by;

SELECT '🎉 DONE! Now refresh /api/auth/session - profile should show up!' as message;
