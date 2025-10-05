-- Check if delivery exists for the test order
SELECT 
    'Deliveries linked to test order:' as info,
    id,
    order_uuid,
    status,
    delivery_date,
    notes,
    created_at
FROM deliveries
WHERE order_uuid = 'af770470-071a-4f39-ad31-44bf2e3d8053'
ORDER BY created_at DESC;

-- Check if any delivery_items exist
SELECT 
    'Delivery items for test order:' as info,
    di.id,
    di.delivery_id,
    di.product_name,
    di.quantity,
    di.total_price
FROM delivery_items di
JOIN deliveries d ON d.id = di.delivery_id
WHERE d.order_uuid = 'af770470-071a-4f39-ad31-44bf2e3d8053';

-- If delivery exists but no items, use this ID to add items:
-- Copy the delivery ID from above and use it below

/*
INSERT INTO delivery_items (
    delivery_id,
    product_name,
    quantity,
    unit,
    unit_price,
    total_price,
    created_at,
    updated_at
)
VALUES (
    'PASTE_DELIVERY_ID_HERE', -- Get from query above
    'Cement - Portland Type I',
    50.00, -- 50 bags delivered (out of 100 ordered)
    'bags',
    50.00, -- $50 per bag
    2500.00, -- 50 × $50 = $2,500
    NOW(),
    NOW()
)
RETURNING 
    id,
    product_name,
    quantity,
    total_price,
    '✅ Items added! Check results below ⬇️' as next_step;
*/

-- After adding items, check the auto-calculation results:
/*
SELECT 
    '🎯 FINAL TEST RESULTS' as section,
    id,
    description,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value,
    CASE 
        WHEN delivery_progress = 'partially_delivered' 
        AND delivered_qty = 50 
        AND remaining_qty = 50 
        AND delivered_value = 2500
        THEN '✅✅✅ SUCCESS! Auto-calculation working!'
        ELSE '⚠️ Values: ' || delivery_progress || ', qty: ' || delivered_qty::text
    END as result
FROM purchase_orders
WHERE id = 'af770470-071a-4f39-ad31-44bf2e3d8053';
*/
