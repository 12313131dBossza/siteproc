-- =====================================================
-- Bypass the last admin protection temporarily
-- =====================================================

-- Step 1: Disable the trigger temporarily
ALTER TABLE profiles DISABLE TRIGGER ALL;

-- Step 2: Update your profile
UPDATE profiles 
SET 
  full_name = 'Yaibo Ndiseiei',  -- Change this to your actual name
  role = 'owner',
  phone = '+62 123 456 789',  -- Change to your phone
  department = 'Management'
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 3: Re-enable the triggers
ALTER TABLE profiles ENABLE TRIGGER ALL;

-- Step 4: Verify the update
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  department,
  phone,
  company_id
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';
