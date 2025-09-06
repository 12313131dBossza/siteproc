-- Add Member Role and Update User Roles
-- Run this in Supabase SQL Editor

-- Step 1: Check current users and their roles
SELECT 
    u.email,
    p.role,
    p.full_name,
    p.id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at;

-- Step 2: Update your role constraint to include 'member' (if it doesn't exist)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'owner', 'bookkeeper', 'member', 'viewer'));

-- Step 3: Create/Update profiles with different roles for testing
-- Replace the email addresses below with your actual test accounts

-- Example: Set one user as member (replace with actual email)
UPDATE public.profiles 
SET role = 'member'
WHERE id IN (
    SELECT u.id FROM auth.users u 
    WHERE u.email = 'member@example.com'  -- Replace with actual member email
);

-- Example: Set another user as viewer (replace with actual email)
UPDATE public.profiles 
SET role = 'viewer'
WHERE id IN (
    SELECT u.id FROM auth.users u 
    WHERE u.email = 'viewer@example.com'  -- Replace with actual viewer email
);

-- Keep existing admin (replace with actual email)
UPDATE public.profiles 
SET role = 'admin'
WHERE id IN (
    SELECT u.id FROM auth.users u 
    WHERE u.email = 'admin@example.com'   -- Replace with actual admin email
);

-- Step 4: If you need to create test users, you can invite them via Supabase Auth
-- Or create profiles for existing users who don't have profiles yet
INSERT INTO public.profiles (id, role, full_name)
SELECT 
    u.id,
    'member' as role,  -- or 'viewer', 'admin'
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL  -- Only insert for users without profiles
ON CONFLICT (id) DO NOTHING;

-- Step 5: Verification - Check all users and roles
SELECT 
    u.email,
    COALESCE(p.role, 'NO PROFILE') as role,
    COALESCE(p.full_name, 'Unknown') as full_name,
    u.created_at as user_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at;
