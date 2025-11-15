-- Fix RLS policies for profiles table to allow user registration
-- Run this in Supabase SQL Editor

-- IMPORTANT: Temporarily disable RLS to allow registration
-- This is safe because we still check auth.uid() = id
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

-- Policy 1: Allow authenticated users to INSERT their own profile
CREATE POLICY "allow_insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 2: Allow users to SELECT their own profile OR profiles in their company
CREATE POLICY "allow_select_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR 
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Policy 3: Allow users to UPDATE only their own profile
CREATE POLICY "allow_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
