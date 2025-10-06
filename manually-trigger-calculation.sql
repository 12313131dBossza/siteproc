-- Manually recalculate delivery progress for your order
-- This is what the trigger should do automatically

-- First, let's see what deliveries we have
SELECT 
    d.id as delivery_id,
    d.order_uuid,
    d.total_amount as delivery_amount,
    di.quantity,
    di.unit_price
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- Now manually call the trigger function
SELECT calculate_order_delivery_progress();

-- Check the updated order status
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
