-- Quick check if orders-deliveries sync migration was applied
-- Run this in Supabase SQL Editor

-- 1. Check if delivery_progress column exists in purchase_orders
SELECT 
  'Checking purchase_orders for delivery sync columns...' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      AND column_name = 'delivery_progress'
    ) THEN '✅ delivery_progress EXISTS'
    ELSE '❌ delivery_progress MISSING - MIGRATION NEEDED'
  END as delivery_progress_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      AND column_name = 'ordered_qty'
    ) THEN '✅ ordered_qty EXISTS'
    ELSE '❌ ordered_qty MISSING'
  END as ordered_qty_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      AND column_name = 'delivered_qty'
    ) THEN '✅ delivered_qty EXISTS'
    ELSE '❌ delivered_qty MISSING'
  END as delivered_qty_status;

-- 2. Check if calculate_order_delivery_progress function exists
SELECT 
  'Checking for calculation function...' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'calculate_order_delivery_progress'
      AND routine_schema = 'public'
    ) THEN '✅ Function EXISTS'
    ELSE '❌ Function MISSING - MIGRATION NEEDED'
  END as function_status;

-- 3. Check if triggers exist
SELECT 
  'Checking for triggers...' as status,
  COUNT(*) as trigger_count,
  STRING_AGG(trigger_name, ', ') as trigger_names
FROM information_schema.triggers
WHERE event_object_table IN ('deliveries', 'delivery_items')
AND trigger_schema = 'public';

-- 4. Show current purchase_orders columns
SELECT 'Current purchase_orders columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check deliveries.order_id type (should be UUID not TEXT)
SELECT 
  'Checking deliveries.order_id type...' as status,
  data_type as current_type,
  CASE 
    WHEN data_type = 'uuid' THEN '✅ Correct type (UUID)'
    WHEN data_type = 'text' THEN '⚠️ Wrong type (TEXT) - should be UUID'
    ELSE '❓ Unexpected type'
  END as type_status
FROM information_schema.columns
WHERE table_name = 'deliveries'
AND column_name = 'order_id'
AND table_schema = 'public';
