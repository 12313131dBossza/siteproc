-- 🔧 FIX ORDERS DISPLAY ISSUE
-- This script will help diagnose and fix why orders aren't showing

-- STEP 1: Check which table has your data
DO $$
DECLARE
  purchase_orders_count INTEGER;
  orders_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO purchase_orders_count FROM purchase_orders;
  SELECT COUNT(*) INTO orders_count FROM orders;
  
  RAISE NOTICE 'purchase_orders table has % rows', purchase_orders_count;
  RAISE NOTICE 'orders table has % rows', orders_count;
  
  IF orders_count > 0 AND purchase_orders_count = 0 THEN
    RAISE NOTICE '⚠️  Data is in "orders" table but API expects "purchase_orders"';
    RAISE NOTICE '🔧 Run the migration below to copy data';
  ELSIF purchase_orders_count > 0 THEN
    RAISE NOTICE '✅ Data exists in purchase_orders table';
    RAISE NOTICE '🔍 Check RLS policies and company_id matching';
  ELSE
    RAISE NOTICE '❌ No data found in either table';
    RAISE NOTICE '📝 You need to create some orders first';
  END IF;
END $$;

-- STEP 2: If data is in old "orders" table, migrate it to "purchase_orders"
-- (Only run this if the check above shows data in orders table)

-- First, let's see what structure the old orders table has
SELECT 
  'Old orders table structure:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 3: Copy compatible data from orders to purchase_orders
-- (Adjust the INSERT based on what columns your orders table actually has)
-- Comment this out if your orders table has incompatible structure

-- INSERT INTO purchase_orders (
--   project_id,
--   amount,
--   description,
--   category,
--   status,
--   requested_by,
--   created_at
-- )
-- SELECT 
--   project_id,
--   amount,
--   description,
--   category,
--   status,
--   requested_by,
--   created_at
-- FROM orders
-- WHERE NOT EXISTS (
--   SELECT 1 FROM purchase_orders po WHERE po.id = orders.id
-- );

-- STEP 4: Verify RLS policies allow you to see the data
SELECT 
  '✅ RLS Policies on purchase_orders:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'purchase_orders';

-- STEP 5: Test if you can see purchase_orders data
SELECT 
  '🔍 Testing SELECT access to purchase_orders:' as info;
SELECT 
  po.id,
  po.amount,
  po.description,
  po.status,
  p.name as project_name,
  p.company_id,
  prof.company_id as your_company_id,
  CASE 
    WHEN p.company_id = prof.company_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as company_match
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
CROSS JOIN profiles prof
WHERE prof.id = auth.uid()
ORDER BY po.created_at DESC
LIMIT 10;

-- STEP 6: Show what the API will return
SELECT 
  '📊 This is what the API should return:' as info;
SELECT 
  po.id,
  po.project_id,
  po.amount,
  po.description,
  po.category,
  po.status,
  po.requested_by,
  po.requested_at,
  po.created_at,
  p.name as project_name,
  p.company_id,
  prof.full_name as requested_by_name
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
INNER JOIN profiles prof ON prof.id = po.requested_by
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY po.created_at DESC;
