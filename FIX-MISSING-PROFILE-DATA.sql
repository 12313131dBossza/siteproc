-- FIX-MISSING-PROFILE-DATA.sql
-- Run this in Supabase SQL Editor to fix profiles missing email/full_name
-- This updates profiles that have NULL email by pulling from auth.users

-- Step 1: Check which profiles are missing data
SELECT 
  p.id,
  p.email as profile_email,
  p.full_name,
  p.role,
  p.status,
  u.email as auth_email,
  u.raw_user_meta_data->>'full_name' as auth_full_name
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email IS NULL OR p.full_name IS NULL;

-- Step 2: Update profiles with email from auth.users
UPDATE public.profiles p
SET 
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)),
  status = COALESCE(p.status, 'active'),
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
AND (p.email IS NULL OR p.full_name IS NULL);

-- Step 3: Make sure all profiles have a status
UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL;

-- Step 4: If the first user (company creator) should be 'owner' not 'admin', fix it
-- This finds users who created their company and sets them as owner
UPDATE public.profiles p
SET role = 'owner'
FROM public.companies c
WHERE p.company_id = c.id
AND p.id = c.created_by
AND p.role != 'owner';

-- Step 5: Verify the fix
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.status,
  p.company_id,
  c.name as company_name,
  CASE WHEN p.id = c.created_by THEN 'Yes' ELSE 'No' END as is_company_creator
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
ORDER BY p.created_at ASC;
