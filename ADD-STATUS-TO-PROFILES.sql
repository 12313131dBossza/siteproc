-- ADD-STATUS-TO-PROFILES.sql
-- Run this in Supabase SQL Editor to add status column and set proper values

-- Step 1: Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE 'Added status column';
  END IF;
END $$;

-- Step 2: Add last_login column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_login'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_login TIMESTAMPTZ;
    RAISE NOTICE 'Added last_login column';
  END IF;
END $$;

-- Step 3: Set all existing users to 'active' status (they have accounts)
UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL OR status = 'pending';

-- Step 4: Update last_login from auth.users
UPDATE public.profiles p
SET last_login = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
AND u.last_sign_in_at IS NOT NULL;

-- Step 5: Verify the changes
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.status,
  p.last_login,
  u.last_sign_in_at as auth_last_sign_in
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at;
