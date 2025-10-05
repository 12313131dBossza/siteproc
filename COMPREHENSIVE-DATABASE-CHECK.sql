-- 🔍 COMPREHENSIVE DATABASE STATE CHECK
-- Run this in Supabase SQL Editor to verify current setup
-- Date: 2025-01-05

-- ======================
-- 1. CHECK ALL TABLES
-- ======================
SELECT '=== TABLE EXISTENCE CHECK ===' as section;

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('purchase_orders', 'deliveries', 'delivery_items', 'projects', 'expenses', 'products', 'companies', 'profiles') THEN '✅ EXISTS'
    ELSE '❓ FOUND'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'purchase_orders', 'deliveries', 'delivery_items', 'projects', 
  'expenses', 'products', 'payments', 'activity_log', 
  'companies', 'profiles', 'suppliers'
)
ORDER BY table_name;

-- Check for missing critical tables
SELECT 
  '⚠️ MISSING TABLES' as alert,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') 
    THEN 'payments table MISSING'
    ELSE 'payments table exists'
  END as payments_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log' AND table_schema = 'public') 
    THEN 'activity_log table MISSING'
    ELSE 'activity_log table exists'
  END as activity_log_status;

-- ======================
-- 2. CHECK PURCHASE_ORDERS STRUCTURE
-- ======================
SELECT '=== PURCHASE_ORDERS STRUCTURE ===' as section;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check specifically for delivery sync columns
SELECT 
  '📦 DELIVERY SYNC COLUMNS' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'delivery_progress') 
    THEN '✅ delivery_progress EXISTS' ELSE '❌ MISSING' END as delivery_progress,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'ordered_qty') 
    THEN '✅ ordered_qty EXISTS' ELSE '❌ MISSING' END as ordered_qty,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'delivered_qty') 
    THEN '✅ delivered_qty EXISTS' ELSE '❌ MISSING' END as delivered_qty,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'remaining_qty') 
    THEN '✅ remaining_qty EXISTS' ELSE '❌ MISSING' END as remaining_qty,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'delivered_value') 
    THEN '✅ delivered_value EXISTS' ELSE '❌ MISSING' END as delivered_value;

-- ======================
-- 3. CHECK DELIVERIES STRUCTURE
-- ======================
SELECT '=== DELIVERIES STRUCTURE ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deliveries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check deliveries.order_id type
SELECT 
  '🚚 DELIVERIES.ORDER_ID TYPE' as check,
  data_type as current_type,
  CASE 
    WHEN data_type = 'uuid' THEN '✅ Correct (UUID)'
    WHEN data_type IN ('text', 'character varying') THEN '⚠️ TEXT - Should be UUID for FK'
    ELSE '❓ Unexpected'
  END as type_status
FROM information_schema.columns
WHERE table_name = 'deliveries' AND column_name = 'order_id' AND table_schema = 'public';

-- Check for foreign key constraint
SELECT 
  '🔗 FOREIGN KEY CHECK' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'deliveries'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'order_id'
    ) THEN '✅ FK exists (deliveries.order_id → purchase_orders.id)'
    ELSE '❌ FK MISSING'
  END as fk_status;

-- ======================
-- 4. CHECK DELIVERY_ITEMS STRUCTURE
-- ======================
SELECT '=== DELIVERY_ITEMS STRUCTURE ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'delivery_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================
-- 5. CHECK PROJECTS STRUCTURE
-- ======================
SELECT '=== PROJECTS STRUCTURE ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for budget tracking columns
SELECT 
  '💰 BUDGET TRACKING COLUMNS' as check,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget') 
    THEN '✅ budget EXISTS' ELSE '❌ MISSING' END as budget_col,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'actual_cost') 
    THEN '✅ actual_cost EXISTS' ELSE '❌ MISSING' END as actual_cost_col,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'variance') 
    THEN '✅ variance EXISTS' ELSE '⚠️ MISSING (can be calculated)' END as variance_col;

-- ======================
-- 6. CHECK EXPENSES STRUCTURE
-- ======================
SELECT '=== EXPENSES STRUCTURE ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public')
    THEN '✅ Expenses table EXISTS'
    ELSE '❌ Expenses table MISSING'
  END as expenses_table_status;

-- If table exists, show structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
    RAISE NOTICE 'Showing expenses structure...';
  END IF;
END $$;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================
-- 7. CHECK PRODUCTS STRUCTURE
-- ======================
SELECT '=== PRODUCTS STRUCTURE ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public')
    THEN '✅ Products table EXISTS'
    ELSE '❌ Products table MISSING'
  END as products_table_status;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================
-- 8. CHECK FUNCTIONS
-- ======================
SELECT '=== POSTGRESQL FUNCTIONS ===' as section;

SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'calculate_order_delivery_progress' THEN '✅ CRITICAL - Orders sync'
    WHEN routine_name LIKE '%delivery%' THEN '📦 Delivery-related'
    ELSE '📝 Other'
  END as importance
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'calculate_order_delivery_progress',
  'trigger_update_order_delivery_progress',
  'trigger_update_order_from_delivery_items',
  'handle_updated_at'
)
ORDER BY routine_name;

-- Check if critical function exists
SELECT 
  '🧮 CALCULATION FUNCTION' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'calculate_order_delivery_progress'
      AND routine_schema = 'public'
    ) THEN '✅ calculate_order_delivery_progress() EXISTS'
    ELSE '❌ MISSING - MIGRATION NEEDED'
  END as function_status;

-- ======================
-- 9. CHECK TRIGGERS
-- ======================
SELECT '=== TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  CASE 
    WHEN trigger_name LIKE '%delivery%' THEN '📦 Delivery-related'
    WHEN trigger_name LIKE '%order%' THEN '📝 Order-related'
    ELSE '⚙️ Other'
  END as category
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('deliveries', 'delivery_items', 'purchase_orders', 'expenses', 'projects')
ORDER BY event_object_table, trigger_name;

-- Check for critical triggers
SELECT 
  '⚡ CRITICAL TRIGGERS' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name LIKE '%delivery%'
      AND event_object_table = 'deliveries'
    ) THEN '✅ Delivery triggers exist'
    ELSE '❌ MISSING'
  END as delivery_triggers,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name LIKE '%delivery%'
      AND event_object_table = 'delivery_items'
    ) THEN '✅ Delivery items triggers exist'
    ELSE '❌ MISSING'
  END as delivery_items_triggers;

-- ======================
-- 10. CHECK INDEXES
-- ======================
SELECT '=== INDEXES ===' as section;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('purchase_orders', 'deliveries', 'delivery_items', 'projects', 'expenses')
ORDER BY tablename, indexname;

-- ======================
-- 11. DATA COUNTS
-- ======================
SELECT '=== DATA COUNTS ===' as section;

SELECT 
  'purchase_orders' as table_name,
  COUNT(*) as row_count
FROM purchase_orders
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'delivery_items', COUNT(*) FROM delivery_items
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'expenses', COUNT(*) FROM COALESCE((SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses'), 0)
ORDER BY table_name;

-- ======================
-- 12. SAMPLE DATA CHECK
-- ======================
SELECT '=== SAMPLE DATA ===' as section;

-- Sample order with delivery progress
SELECT 
  '📦 Sample Order:' as type,
  id,
  description,
  amount,
  status,
  delivery_progress,
  ordered_qty,
  delivered_qty,
  remaining_qty
FROM purchase_orders
WHERE delivery_progress IS NOT NULL
LIMIT 1;

-- If no order has delivery_progress, show any order
SELECT 
  '📦 Any Order:' as type,
  id,
  description,
  amount,
  status
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 1;

-- Sample delivery
SELECT 
  '🚚 Sample Delivery:' as type,
  id,
  order_id,
  status,
  delivery_date,
  total_amount
FROM deliveries
ORDER BY created_at DESC
LIMIT 1;

-- ======================
-- 13. SUMMARY & RECOMMENDATIONS
-- ======================
SELECT '=== MIGRATION STATUS SUMMARY ===' as section;

SELECT 
  '📊 STATUS SUMMARY' as report,
  
  -- Orders migration status
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'delivery_progress')
    THEN '✅ Orders×Deliveries migration APPLIED'
    ELSE '❌ Orders×Deliveries migration NEEDED'
  END as orders_sync_status,
  
  -- Function status
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_order_delivery_progress')
    THEN '✅ Calculation function EXISTS'
    ELSE '❌ Function MISSING'
  END as function_status,
  
  -- Payments table
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments')
    THEN '✅ Payments table EXISTS'
    ELSE '⚠️ Payments table NEEDED'
  END as payments_status,
  
  -- Activity log
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log')
    THEN '✅ Activity log EXISTS'
    ELSE '⚠️ Activity log NEEDED'
  END as activity_log_status;

-- Final recommendation
SELECT 
  '🎯 NEXT ACTIONS' as recommendation,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'delivery_progress')
    THEN '1️⃣ RUN orders-deliveries-sync-migration.sql IMMEDIATELY'
    ELSE '✅ Orders sync migration already applied'
  END as action_1,
  
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments')
    THEN '2️⃣ CREATE payments table'
    ELSE '✅ Payments table exists'
  END as action_2,
  
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log')
    THEN '3️⃣ CREATE activity_log table'
    ELSE '✅ Activity log exists'
  END as action_3;
