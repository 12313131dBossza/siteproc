-- Temporarily disable RLS on profiles table for testing
-- This allows user registration to work
-- We'll add proper RLS policies back later

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
