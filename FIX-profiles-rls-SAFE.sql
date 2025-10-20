-- =====================================================
-- FIX: Drop ALL existing policies and recreate (SAFE)
-- =====================================================

-- Step 1: Get list of all current policies
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Drop ALL possible policy names that might exist
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
  END LOOP;
END $$;

-- Step 3: Verify all policies are dropped
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 4: Create SIMPLE, non-recursive policies

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

-- Step 5: Verify new policies are created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
