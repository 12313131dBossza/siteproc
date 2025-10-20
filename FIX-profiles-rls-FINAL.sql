-- =====================================================
-- FINAL FIX: Use security definer function to avoid recursion
-- =====================================================

-- Step 1: Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- Step 2: Drop the problematic policy
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;

-- Step 3: Recreate it using the helper function (NO RECURSION!)
CREATE POLICY "profiles_select_company" ON profiles
  FOR SELECT USING (
    company_id = get_my_company_id() 
    AND company_id IS NOT NULL
  );

-- Step 4: Do the same for update policy
DROP POLICY IF EXISTS "profiles_update_company" ON profiles;

CREATE POLICY "profiles_update_company" ON profiles
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Step 5: Verify all policies
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
