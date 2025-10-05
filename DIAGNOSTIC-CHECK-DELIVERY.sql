-- ============================================
-- DIAGNOSTIC: Check Delivery Status
-- ============================================

-- 1. Check if delivery was created
SELECT 
  'DELIVERIES CHECK' as info,
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN order_uuid IS NOT NULL THEN 1 END) as with_order_uuid,
  COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as with_order_id
FROM deliveries;

-- 2. Show all deliveries for your company
SELECT 
  d.id,
  d.order_uuid,
  d.order_id,
  d.delivery_date,
  d.status,
  d.driver_name,
  d.company_id,
  COUNT(di.id) as item_count
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'
GROUP BY d.id, d.order_uuid, d.order_id, d.delivery_date, d.status, d.driver_name, d.company_id
ORDER BY d.created_at DESC;

-- 3. Check if the delivery is linked to your cement order
SELECT 
  d.id as delivery_id,
  d.order_uuid,
  d.delivery_date,
  d.status,
  po.id as order_id,
  po.description as order_description,
  po.delivery_progress
FROM deliveries d
LEFT JOIN purchase_orders po ON po.id = d.order_uuid
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287'
ORDER BY d.created_at DESC;

-- 4. Check delivery items
SELECT 
  di.id,
  di.delivery_id,
  di.product_name,
  di.quantity,
  di.unit,
  di.unit_price,
  di.total_price
FROM delivery_items di
JOIN deliveries d ON d.id = di.delivery_id
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- 5. Check the order's current status
SELECT 
  id,
  description,
  delivery_progress,
  ordered_qty,
  delivered_qty,
  remaining_qty,
  delivered_value
FROM purchase_orders
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';
