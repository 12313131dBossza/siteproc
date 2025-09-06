-- Check Profiles Table Structure and Fix Member Role
-- Run this in Supabase SQL Editor

-- Step 1: Check your profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 2: Check current users and their roles
SELECT 
    u.email,
    p.role,
    p.full_name,
    p.id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at;
