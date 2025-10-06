-- Check the current status of your order
SELECT 
    id,
    description,
    amount,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value,
    status
FROM purchase_orders
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- If ordered_qty is still 0, let's fix it
UPDATE purchase_orders
SET ordered_qty = 10
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287'
  AND ordered_qty = 0;

-- Manually trigger the calculation
SELECT calculate_order_delivery_progress();

-- Check again
SELECT 
    id,
    description,
    amount,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value,
    status
FROM purchase_orders
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';
