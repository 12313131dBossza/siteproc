-- ============================================================================
-- PHASE 3 VERIFICATION SCRIPT
-- Verifies Orders × Deliveries Sync is properly configured
-- ============================================================================

-- Check if delivery progress columns exist in purchase_orders
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name IN (
  'delivery_progress',
  'ordered_qty',
  'delivered_qty',
  'remaining_qty',
  'delivered_value'
)
ORDER BY ordinal_position;

-- ============================================================================
-- Check if sync function exists
-- ============================================================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%delivery%sync%'
OR routine_name LIKE '%update%order%progress%';

-- ============================================================================
-- Check if trigger exists
-- ============================================================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'deliveries'
OR event_object_table = 'delivery_items';

-- ============================================================================
-- Test Data - Check current orders with deliveries
-- ============================================================================

-- Orders with delivery progress
SELECT 
  po.id,
  po.order_number,
  po.status,
  po.ordered_qty,
  po.delivered_qty,
  po.remaining_qty,
  po.delivery_progress,
  po.delivered_value,
  COUNT(d.id) as delivery_count
FROM purchase_orders po
LEFT JOIN deliveries d ON d.order_id = po.id
GROUP BY po.id, po.order_number, po.status, po.ordered_qty, po.delivered_qty, 
         po.remaining_qty, po.delivery_progress, po.delivered_value
ORDER BY po.created_at DESC
LIMIT 10;

-- ============================================================================
-- Check deliveries linked to orders
-- ============================================================================

SELECT 
  d.id as delivery_id,
  d.order_id,
  d.status as delivery_status,
  po.order_number,
  po.delivery_progress as order_progress,
  COUNT(di.id) as item_count,
  SUM(di.quantity) as total_qty_delivered
FROM deliveries d
LEFT JOIN purchase_orders po ON po.id = d.order_id
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_id IS NOT NULL
GROUP BY d.id, d.order_id, d.status, po.order_number, po.delivery_progress
ORDER BY d.created_at DESC
LIMIT 10;

-- ============================================================================
-- Summary Report
-- ============================================================================

SELECT 
  'Total Orders' as metric,
  COUNT(*) as count
FROM purchase_orders
UNION ALL
SELECT 
  'Orders with Deliveries',
  COUNT(DISTINCT order_id)
FROM deliveries
WHERE order_id IS NOT NULL
UNION ALL
SELECT 
  'Pending Deliveries',
  COUNT(*)
FROM deliveries
WHERE status = 'pending'
UNION ALL
SELECT 
  'In Transit Deliveries',
  COUNT(*)
FROM deliveries
WHERE status = 'partial'
UNION ALL
SELECT 
  'Completed Deliveries',
  COUNT(*)
FROM deliveries
WHERE status = 'delivered'
UNION ALL
SELECT 
  'Orders - Not Started',
  COUNT(*)
FROM purchase_orders
WHERE delivery_progress = 'not_started'
UNION ALL
SELECT 
  'Orders - Partially Delivered',
  COUNT(*)
FROM purchase_orders
WHERE delivery_progress = 'partially_delivered'
UNION ALL
SELECT 
  'Orders - Completed',
  COUNT(*)
FROM purchase_orders
WHERE delivery_progress = 'completed';
