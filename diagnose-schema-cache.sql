-- 🔍 DIAGNOSE SCHEMA CACHE ISSUE
-- Check if PostgREST API layer can see the orders table properly

-- 1. Check table in information_schema (PostgreSQL level)
SELECT 'PostgreSQL Schema Check' as check_type;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'orders';

-- 2. Check columns visible to PostgreSQL
SELECT 'PostgreSQL Columns' as check_type;
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- 3. Check RLS is enabled
SELECT 'RLS Status' as check_type;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'orders';

-- 4. Check current user and their access
SELECT 'Current User Info' as check_type;
SELECT 
  auth.uid() as user_id,
  auth.role() as user_role,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
  (SELECT company_id FROM profiles WHERE id = auth.uid()) as company_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as profile_role;

-- 5. Check if user has projects they can access
SELECT 'User Projects' as check_type;
SELECT p.id, p.name, p.company_id
FROM projects p
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.id = auth.uid()
LIMIT 3;

-- 6. Test RLS policy for SELECT (should work)
SELECT 'RLS SELECT Test' as check_type;
SELECT COUNT(*) as accessible_orders
FROM orders;

-- 7. Try to see what PostgREST API would return
-- This simulates the API layer's view
SELECT 'Simulated API View' as check_type;
SELECT 
  json_build_object(
    'table_exists', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'orders'),
    'rls_enabled', (SELECT rowsecurity FROM pg_tables WHERE tablename = 'orders'),
    'column_count', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders'),
    'has_amount_column', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'amount'),
    'user_can_select', EXISTS(SELECT 1 FROM orders LIMIT 1) OR NOT EXISTS(SELECT 1 FROM orders)
  ) as api_status;

-- 8. Direct insert test with error details
DO $$
DECLARE
  v_test_order_id UUID;
  v_project_id UUID;
BEGIN
  -- Get a project
  SELECT id INTO v_project_id FROM projects 
  WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  LIMIT 1;
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'No project found for testing';
  END IF;
  
  -- Try direct insert
  INSERT INTO orders (
    project_id, amount, description, category, 
    status, requested_by, requested_at
  ) VALUES (
    v_project_id, 99.99, 'Direct SQL test', 'Test',
    'pending', auth.uid(), NOW()
  ) RETURNING id INTO v_test_order_id;
  
  RAISE NOTICE '✅ Direct insert successful! Order ID: %', v_test_order_id;
  
  -- Clean up
  DELETE FROM orders WHERE id = v_test_order_id;
  RAISE NOTICE '✅ Test order deleted';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Direct insert failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;
