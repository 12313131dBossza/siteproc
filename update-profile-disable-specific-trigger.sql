-- =====================================================
-- Find and disable only the prevent_last_admin trigger
-- =====================================================

-- Step 1: Find the trigger name
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name LIKE '%admin%';

-- Step 2: Disable only that specific trigger
ALTER TABLE profiles DISABLE TRIGGER prevent_last_admin_loss;

-- Step 3: Update your profile
UPDATE profiles 
SET 
  full_name = 'Yaibo Ndiseiei',  -- Change this to your actual name
  role = 'owner',
  phone = '+62 123 456 789',  -- Change to your phone
  department = 'Management'
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 4: Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER prevent_last_admin_loss;

-- Step 5: Verify the update
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
