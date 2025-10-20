-- =====================================================
-- FIX: Infinite Recursion in Profiles RLS Policy
-- =====================================================

-- Step 1: Drop all existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their company" ON profiles;

-- Step 2: Create SIMPLE, non-recursive policies

-- Allow users to view their own profile (no recursion)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to view other profiles in their company (FIXED - no recursion)
CREATE POLICY "profiles_select_company" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
        AND p2.company_id = profiles.company_id
        AND p2.company_id IS NOT NULL
    )
  );

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow owners/admins to update profiles in their company
CREATE POLICY "profiles_update_company" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
        AND p2.company_id = profiles.company_id
        AND p2.role IN ('owner', 'admin')
    )
  );

-- Allow profile creation during signup
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify policies are created
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
