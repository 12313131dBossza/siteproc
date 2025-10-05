-- ⚡ QUICK TEST: Create Delivery and Verify Auto-Calculation
-- Test Order ID: af770470-071a-4f39-ad31-44bf2e3d8053

-- STEP 1: Create a simple delivery linked to the test order
INSERT INTO deliveries (
    company_id, -- Required field
    order_uuid, -- Using the NEW UUID column!
    status,
    delivery_date,
    notes,
    created_at,
    updated_at
)
VALUES (
    '1e2e7ccf-29fa-4511-b0d3-93c8347ead33', -- Your company_id
    'af770470-071a-4f39-ad31-44bf2e3d8053', -- Test order ID
    'delivered', -- Must be 'delivered' for trigger to count it
    NOW(),
    'Test Partial Delivery - 50 bags',
    NOW(),
    NOW()
)
RETURNING 
    id,
    order_uuid,
    status,
    '✅ Copy this Delivery ID ⬆️' as next_step;

-- STEP 2: Add delivery items (replace DELIVERY_ID with the ID from above)
-- Uncomment and run after Step 1:

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
    'PASTE_DELIVERY_ID_HERE', -- From Step 1
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
    '✅ Now check the test results below ⬇️' as next_step;
*/

-- STEP 3: Verify Auto-Calculation (run after Steps 1 & 2)
/*
SELECT 
    '🎯 TEST RESULTS' as section,
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
        THEN '✅✅✅ SUCCESS! Auto-calculation working perfectly!'
        WHEN delivery_progress = 'pending_delivery'
        THEN '⚠️ Trigger may not have fired - check delivery status is "delivered"'
        ELSE '⚠️ Unexpected values - check calculation function'
    END as result
FROM purchase_orders
WHERE id = 'af770470-071a-4f39-ad31-44bf2e3d8053';
*/

-- QUICK CHECK: View the order status right now
SELECT 
    'Before delivery items added:' as status,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty
FROM purchase_orders
WHERE id = 'af770470-071a-4f39-ad31-44bf2e3d8053';
