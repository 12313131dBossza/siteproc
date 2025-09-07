-- Diagnostic Script: Check Database State
-- Run this FIRST to see what's missing in your database

SELECT 'DIAGNOSTIC: Checking database state for order persistence issue' as info;

-- Check 1: Do core tables exist?
SELECT 
  'Table Existence Check:' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN '✅ orders table exists'
    ELSE '❌ orders table MISSING'
  END as orders_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN '✅ order_items table exists'
    ELSE '❌ order_items table MISSING'
  END as order_items_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliveries') THEN '✅ deliveries table exists'
    ELSE '❌ deliveries table MISSING'
  END as deliveries_status;

-- Check 2: Table structure
SELECT 'Column Check for orders:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Check 3: RLS Status
SELECT 
  'RLS Status:' as check_type,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('orders', 'order_items', 'deliveries', 'companies', 'profiles')
ORDER BY tablename;

-- Check 4: Current data
SELECT 'Current orders count:' as info, COUNT(*) as count FROM orders;
SELECT 'Current deliveries count:' as info, COUNT(*) as count FROM deliveries;

-- Check 5: User profile status
SELECT 
  'User Profile Check:' as info,
  u.email,
  p.role,
  p.company_id,
  c.name as company_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY u.email;
