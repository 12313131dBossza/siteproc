-- =====================================================
-- Fix Your Profile Data
-- =====================================================

-- Step 1: Update your profile with full_name and correct role
UPDATE profiles 
SET 
  full_name = 'Your Name Here',  -- Change this to your actual name
  role = 'owner',
  phone = '+1234567890',  -- Optional: your phone
  department = 'Management'  -- Optional: your department
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 2: Verify the update
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  department,
  phone,
  company_id,
  created_at
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 3: Check what the API will return
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  department,
  phone,
  last_login,
  created_at
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE email = 'yaibondiseiei@gmail.com'
);
