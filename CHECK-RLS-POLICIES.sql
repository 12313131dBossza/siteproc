-- 🔍 CHECK RLS POLICIES ON PURCHASE_ORDERS
-- This checks if Row-Level Security is blocking your access

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'purchase_orders';

-- 2. List all RLS policies on purchase_orders
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
WHERE tablename = 'purchase_orders';

-- 3. Test if you can SELECT orders directly (bypass API)
-- This will fail if RLS is blocking you
SELECT 
  '=== DIRECT SELECT TEST ===' as section,
  COUNT(*) as total_orders,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ RLS might be blocking access OR no orders exist'
    ELSE '✅ Can access orders directly'
  END as result
FROM purchase_orders;

-- 4. Check if your auth.uid() matches
SELECT 
  '=== AUTH CHECK ===' as section,
  auth.uid() as your_auth_id,
  id as your_profile_id,
  email,
  CASE 
    WHEN auth.uid() = id THEN '✅ Auth matches profile'
    ELSE '❌ Auth mismatch!'
  END as auth_status
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- 5. Test the EXACT query the API uses
SELECT 
  '=== API QUERY SIMULATION ===' as section,
  COUNT(*) as orders_count
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.id = auth.uid();
