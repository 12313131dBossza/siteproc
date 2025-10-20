-- =====================================================
-- Find all triggers and functions on profiles table
-- =====================================================

-- Step 1: List ALL triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Step 2: Find the function that's throwing the error
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname LIKE '%admin%' OR proname LIKE '%prevent%';

-- Step 3: Try updating without disabling triggers (maybe the error is from a function, not trigger)
-- Just update full_name first without changing role
UPDATE profiles 
SET 
  full_name = 'Yaibo Ndiseiei',  -- Change this to your actual name
  phone = '+62 123 456 789',  -- Change to your phone
  department = 'Management'
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 4: Verify
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  department,
  phone
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';
