-- Diagnose why order creation is failing
-- Run this in Supabase SQL Editor to understand the issue

-- 1. Check if orders table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 2. Check RLS policies on orders table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- 3. Check if you have an authenticated user and profile
SELECT 
  auth.uid() as current_user_id,
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()) as profile_exists,
  (SELECT company_id FROM profiles WHERE id = auth.uid()) as user_company_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as user_role;

-- 4. Check if projects exist in your company
SELECT 
  p.id,
  p.name,
  p.company_id,
  c.name as company_name
FROM projects p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
LIMIT 5;

-- 5. Test if you can manually insert an order (this will show the exact error)
-- Replace the project_id with an actual project ID from step 4
DO $$
DECLARE
  test_project_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a project from user's company
  SELECT p.id INTO test_project_id
  FROM projects p
  INNER JOIN profiles prof ON prof.company_id = p.company_id
  WHERE prof.id = auth.uid()
  LIMIT 1;
  
  -- Get current user id
  SELECT auth.uid() INTO test_user_id;
  
  RAISE NOTICE 'Testing with project_id: %, user_id: %', test_project_id, test_user_id;
  
  -- Try to insert
  INSERT INTO orders (
    project_id,
    amount,
    description,
    category,
    status,
    requested_by,
    requested_at
  ) VALUES (
    test_project_id,
    100.00,
    'Test order',
    'General',
    'pending',
    test_user_id,
    NOW()
  );
  
  RAISE NOTICE 'Order insertion successful!';
  
  -- Clean up test data
  DELETE FROM orders WHERE description = 'Test order' AND amount = 100.00;
  RAISE NOTICE 'Test order cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error inserting order: %', SQLERRM;
END $$;
