-- Check what roles are currently defined in the database

-- Check if user_role enum type exists
SELECT 
  t.typname as enum_name,
  e.enumlabel as role_value,
  e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Check what roles are actually being used in profiles table
SELECT DISTINCT role, COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY count DESC;
