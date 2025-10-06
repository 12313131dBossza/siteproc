-- Fix: Set the ordered_qty for your cement order
-- The order is for 10 bags of cement at $12.50 each = $125

UPDATE purchase_orders
SET 
    ordered_qty = 10,
    remaining_qty = ordered_qty - delivered_qty
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- Now manually recalculate to update delivery_progress
SELECT calculate_order_delivery_progress();

-- Check the result
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
