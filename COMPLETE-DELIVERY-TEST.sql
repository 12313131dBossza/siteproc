-- ⚡ COMPLETE TEST: Create Delivery + Items + Verify Auto-Calculation
-- All in one script - no copy/paste needed!

-- Step 1: Create delivery with items in a transaction
DO $$
DECLARE
    v_delivery_id UUID;
    v_order_id UUID := 'af770470-071a-4f39-ad31-44bf2e3d8053';
BEGIN
    -- Create the delivery
    INSERT INTO deliveries (
        company_id,
        order_uuid,
        status,
        delivery_date,
        notes,
        created_at,
        updated_at
    )
    VALUES (
        '1e2e7ccf-29fa-4511-b0d3-93c8347ead33',
        v_order_id,
        'delivered',
        NOW(),
        'Test Delivery - 50 bags of cement',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_delivery_id;
    
    RAISE NOTICE 'Created delivery: %', v_delivery_id;
    
    -- Add delivery items
    INSERT INTO delivery_items (
        delivery_id,
        product_name,
        quantity,
        unit,
        unit_price,
        total_price
    )
    VALUES (
        v_delivery_id,
        'Cement - Portland Type I',
        50.00,
        'bags',
        50.00,
        2500.00
    );
    
    RAISE NOTICE 'Added delivery items';
    RAISE NOTICE 'Trigger should have fired automatically!';
END $$;

-- Step 2: Check the results immediately
SELECT 
    '🎯 TEST RESULTS - After Adding Delivery' as section,
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
        WHEN delivery_progress = 'pending_delivery' AND delivered_qty = 0
        THEN '❌ Trigger did not fire - check trigger exists and delivery status is correct'
        ELSE '⚠️ Partial success - check values: progress=' || delivery_progress || ', delivered=' || delivered_qty::text
    END as result
FROM purchase_orders
WHERE id = 'af770470-071a-4f39-ad31-44bf2e3d8053';

-- Step 3: Verify delivery and items were created
SELECT 
    '📦 Deliveries Created' as info,
    COUNT(*) as delivery_count,
    SUM((SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id)) as total_items
FROM deliveries d
WHERE d.order_uuid = 'af770470-071a-4f39-ad31-44bf2e3d8053';

-- Step 4: Show detailed breakdown
SELECT 
    '📊 Detailed Breakdown' as section,
    d.id as delivery_id,
    d.status,
    d.notes,
    di.product_name,
    di.quantity,
    di.total_price
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid = 'af770470-071a-4f39-ad31-44bf2e3d8053'
ORDER BY d.created_at DESC, di.product_name;
