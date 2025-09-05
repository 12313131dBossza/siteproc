-- Expense Workflow Polish - Complete RLS Policy Fix
-- Run this in Supabase SQL Editor

-- Step 1: Remove existing policies to start clean
DROP POLICY IF EXISTS expenses_service_access ON public.expenses;
DROP POLICY IF EXISTS expenses_admin_all ON public.expenses;
DROP POLICY IF EXISTS expenses_own ON public.expenses;
DROP POLICY IF EXISTS expenses_viewer_approved ON public.expenses;
DROP POLICY IF EXISTS expenses_rls ON public.expenses;
DROP POLICY IF EXISTS expenses_simple_auth ON public.expenses;

-- Step 2: Create proper role-based RLS policies

-- Policy 1: Admins see ALL expenses (pending, approved, rejected)
CREATE POLICY "expenses_admin_all"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'bookkeeper')
  )
);

-- Policy 2: Members see their OWN expenses (all statuses)
CREATE POLICY "expenses_member_own"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'member'
  )
);

-- Policy 3: Viewers see ONLY approved expenses
CREATE POLICY "expenses_viewer_approved"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'viewer'
  )
);

-- Policy 4: INSERT - Members can create expenses, Admins can create
CREATE POLICY "expenses_insert_members_admins"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'bookkeeper', 'member')
  )
);

-- Policy 5: UPDATE - Only admins can update (for approval workflow)
CREATE POLICY "expenses_update_admins_only"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'bookkeeper')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'bookkeeper')
  )
);

-- Policy 6: DELETE - Only admins can delete
CREATE POLICY "expenses_delete_admins_only"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'bookkeeper')
  )
);

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Step 4: Add service role bypass policy (for API operations)
CREATE POLICY "expenses_service_role_bypass"
ON public.expenses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Ensure user_id is properly set for existing records
-- Update any expenses that don't have user_id set
UPDATE public.expenses 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE auth.users.email = 'admin@example.com' -- Replace with actual admin email
  LIMIT 1
)
WHERE user_id IS NULL;

-- Verification: Check policies were created
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'expenses' AND schemaname = 'public'
ORDER BY policyname;
