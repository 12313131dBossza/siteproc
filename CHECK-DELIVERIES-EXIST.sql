-- Run these queries ONE BY ONE and share ALL results

-- Query 1: Count deliveries
SELECT 
  'DELIVERIES CHECK' as info,
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN order_uuid IS NOT NULL THEN 1 END) as with_order_uuid,
  COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as with_order_id
FROM deliveries;

-- Query 2: Show your company's deliveries
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

-- Query 3: Check delivery linked to your order
SELECT 
  d.id as delivery_id,
  d.order_uuid,
  d.delivery_date,
  d.status,
  po.id as order_id,
  po.description as order_description
FROM deliveries d
LEFT JOIN purchase_orders po ON po.id = d.order_uuid
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- Query 4: Check delivery items
SELECT 
  di.id,
  di.delivery_id,
  di.product_name,
  di.quantity,
  di.unit
FROM delivery_items di
JOIN deliveries d ON d.id = di.delivery_id
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287';
