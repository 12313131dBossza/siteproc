-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'deliveries'
  AND event_object_schema = 'public';

-- Check if the trigger function exists
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'calculate_order_delivery_progress';

-- Test: Check current state of your order
SELECT 
    id,
    description,
    amount,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value
FROM purchase_orders
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- Check deliveries for this order
SELECT 
    d.id,
    d.order_uuid,
    d.delivery_date,
    d.status,
    d.total_amount,
    di.product_name,
    di.quantity,
    di.unit_price
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287'
ORDER BY d.created_at;
