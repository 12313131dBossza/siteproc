-- Test Orders × Deliveries Sync
-- Quick verification and testing guide

-- =====================================================
-- STEP 1: Verify Migration Success
-- =====================================================

SELECT '✅ Check purchase_orders columns' as test;
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('delivery_progress', 'ordered_qty', 'delivered_qty', 'remaining_qty', 'delivered_value')
ORDER BY column_name;

SELECT '✅ Check deliveries columns' as test;
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'deliveries'
AND column_name IN ('order_id', 'order_uuid')
ORDER BY column_name;

-- =====================================================
-- STEP 2: Check Current Data
-- =====================================================

SELECT '📊 Current Orders Summary' as section;
SELECT 
    delivery_progress,
    COUNT(*) as count,
    SUM(ordered_qty) as total_ordered_qty,
    SUM(delivered_qty) as total_delivered_qty
FROM purchase_orders
GROUP BY delivery_progress;

SELECT '📦 Current Deliveries Summary' as section;
SELECT 
    COUNT(*) as total_deliveries,
    COUNT(order_id) as has_order_id_text,
    COUNT(order_uuid) as has_order_uuid,
    COUNT(CASE WHEN order_uuid IS NOT NULL THEN 1 END) as linked_to_orders
FROM deliveries;

-- =====================================================
-- STEP 3: Sample Test Order (Create one for testing)
-- =====================================================

-- Create a test order with quantity
INSERT INTO purchase_orders (
    project_id,
    description,
    category,
    amount,
    ordered_qty,
    status,
    requested_by,
    created_at,
    updated_at
)
VALUES (
    (SELECT id FROM projects WHERE company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33' LIMIT 1), -- First project
    'TEST ORDER - Cement Bags (100 bags)',
    'Materials',
    5000.00,
    100.00, -- 100 bags ordered
    'approved',
    'f34e5416-505a-42b3-a9af-74330c91e05b', -- Your user_id
    NOW(),
    NOW()
)
RETURNING 
    id,
    description,
    ordered_qty,
    delivery_progress,
    'Copy this Order ID for next step ⬆️' as note;

-- =====================================================
-- STEP 4: Create Test Delivery
-- =====================================================

-- Replace 'YOUR_ORDER_ID_HERE' with the ID from above
-- This simulates creating a partial delivery (50 bags delivered)

/*
INSERT INTO deliveries (
    company_id,
    order_uuid, -- Using new UUID column!
    delivery_date,
    status,
    notes,
    created_at,
    updated_at
)
VALUES (
    '1e2e7ccf-29fa-4511-b0d3-93c8347ead33',
    'YOUR_ORDER_ID_HERE', -- Paste order ID here
    NOW(),
    'delivered',
    'Partial delivery - 50 bags',
    NOW(),
    NOW()
)
RETURNING id, order_uuid, status, 'Copy this Delivery ID ⬆️' as note;
*/

-- =====================================================
-- STEP 5: Add Delivery Items
-- =====================================================

-- Replace 'YOUR_DELIVERY_ID_HERE' with delivery ID from above

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
    'YOUR_DELIVERY_ID_HERE', -- Paste delivery ID here
    'Cement - Portland Type I',
    50.00, -- 50 bags delivered
    'bags',
    50.00, -- $50 per bag
    2500.00, -- 50 × $50
    NOW(),
    NOW()
)
RETURNING *;
*/

-- =====================================================
-- STEP 6: Verify Auto-Calculation Worked!
-- =====================================================

/*
-- Check the order - delivery_progress should auto-update to 'partially_delivered'
-- delivered_qty should be 50, remaining_qty should be 50

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
        THEN '✅ AUTO-CALCULATION WORKING!'
        ELSE '❌ Something wrong - check triggers'
    END as result
FROM purchase_orders
WHERE id = 'YOUR_ORDER_ID_HERE'; -- Paste order ID here
*/

-- =====================================================
-- STEP 7: Test Complete Delivery
-- =====================================================

/*
-- Now add another delivery for the remaining 50 bags
-- This should change delivery_progress to 'completed'

INSERT INTO deliveries (
    company_id,
    order_uuid,
    delivery_date,
    status,
    notes,
    created_at,
    updated_at
)
VALUES (
    '1e2e7ccf-29fa-4511-b0d3-93c8347ead33',
    'YOUR_ORDER_ID_HERE',
    NOW(),
    'delivered',
    'Final delivery - remaining 50 bags',
    NOW(),
    NOW()
)
RETURNING id;

-- Add the items (use delivery ID from above)
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
    'YOUR_SECOND_DELIVERY_ID_HERE',
    'Cement - Portland Type I',
    50.00,
    'bags',
    50.00,
    2500.00,
    NOW(),
    NOW()
);

-- Final verification
SELECT 
    '🎯 FINAL TEST' as section,
    id,
    description,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value,
    CASE 
        WHEN delivery_progress = 'completed' 
        AND delivered_qty = 100 
        AND remaining_qty = 0 
        AND delivered_value = 5000
        THEN '✅✅✅ PERFECT! ALL TESTS PASSED!'
        ELSE '⚠️ Check the values'
    END as result
FROM purchase_orders
WHERE id = 'YOUR_ORDER_ID_HERE';
*/

-- =====================================================
-- QUICK REFERENCE
-- =====================================================

SELECT '📝 QUICK REFERENCE' as section;

SELECT 
    'When creating deliveries, use order_uuid column (UUID type)' as note,
    'The old order_id column (TEXT) is kept for backward compatibility' as note2,
    'Frontend displays can show either field' as note3;

-- View all orders with delivery status
SELECT 
    '📦 ALL ORDERS WITH DELIVERY STATUS' as section,
    po.id,
    LEFT(po.description, 40) as description,
    po.delivery_progress,
    po.ordered_qty,
    po.delivered_qty,
    po.remaining_qty,
    COUNT(d.id) as linked_deliveries
FROM purchase_orders po
LEFT JOIN deliveries d ON d.order_uuid = po.id
GROUP BY po.id, po.description, po.delivery_progress, 
         po.ordered_qty, po.delivered_qty, po.remaining_qty
ORDER BY po.created_at DESC
LIMIT 10;
