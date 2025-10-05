-- ============================================
-- QUICK DELIVERY CREATION FOR CEMENT ORDER
-- Follow these 3 simple steps!
-- ============================================

-- STEP 1: Find your cement order UUID and company_id
-- Copy the 'id' value from the results
SELECT 
  purchase_orders.id as "📋 ORDER_UUID (copy this!)",
  purchase_orders.description as "Order Description",
  purchase_orders.amount as "Order Amount",
  purchase_orders.status,
  purchase_orders.delivery_progress as "Current Progress",
  purchase_orders.ordered_qty,
  purchase_orders.delivered_qty,
  purchase_orders.remaining_qty,
  projects.name as "Project Name"
FROM purchase_orders
LEFT JOIN projects ON projects.id = purchase_orders.project_id
WHERE purchase_orders.description LIKE '%Cement%'
ORDER BY purchase_orders.created_at DESC
LIMIT 5;

-- STEP 2: Get your company_id
-- Copy the 'company_id' value from the results
SELECT 
  id as user_id,
  full_name,
  company_id as "📋 COMPANY_ID (copy this!)",
  role
FROM profiles
LIMIT 5;

-- ============================================
-- STEP 3: CREATE THE DELIVERY!
-- Replace 'YOUR-ORDER-UUID' and 'YOUR-COMPANY-ID' below with the values from Steps 1 & 2
-- ============================================

DO $$
DECLARE
  v_order_uuid UUID := 'YOUR-ORDER-UUID-HERE'; -- ← Paste ORDER_UUID from Step 1
  v_company_id UUID := 'YOUR-COMPANY-ID-HERE'; -- ← Paste COMPANY_ID from Step 2
  v_delivery_id UUID;
BEGIN
  -- Create the delivery
  INSERT INTO deliveries (
    id,
    order_uuid,
    delivery_date,
    status,
    driver_name,
    vehicle_number,
    notes,
    total_amount,
    company_id,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    v_order_uuid,
    NOW(),
    'delivered',  -- Change to 'pending' if not delivered yet
    'John Doe',
    'TRK-123',
    'Partial delivery of Portland Cement',
    62.50,  -- 5 bags × $12.50
    v_company_id,
    NOW()
  )
  RETURNING id INTO v_delivery_id;

  RAISE NOTICE '✅ Delivery created! ID: %', v_delivery_id;

  -- Create delivery items (5 bags)
  INSERT INTO delivery_items (
    id,
    delivery_id,
    product_name,
    quantity,
    unit,
    unit_price,
    total_price,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    v_delivery_id,
    'Portland Cement',
    5.00,  -- Delivering 5 out of 10 bags
    'bags',
    12.50,
    62.50,
    NOW()
  );

  RAISE NOTICE '✅ Delivery items created!';
  RAISE NOTICE '🎉 Done! Check your order - it should now show "Partially Delivered"!';
END $$;

-- STEP 4: VERIFY IT WORKED!
-- Check that your order updated automatically
SELECT 
  purchase_orders.id,
  purchase_orders.description,
  purchase_orders.delivery_progress as "Status (should be partially_delivered)",
  purchase_orders.ordered_qty as "Ordered",
  purchase_orders.delivered_qty as "Delivered (should be 5)",
  purchase_orders.remaining_qty as "Remaining (should be 5)",
  purchase_orders.delivered_value as "Value Delivered (should be $62.50)"
FROM purchase_orders
WHERE purchase_orders.description LIKE '%Cement%'
ORDER BY purchase_orders.created_at DESC
LIMIT 1;

-- View the delivery you just created
SELECT 
  d.id,
  d.order_uuid,
  d.delivery_date,
  d.status,
  d.driver_name,
  d.vehicle_number,
  di.product_name,
  di.quantity,
  di.unit,
  di.unit_price,
  di.total_price
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid IN (
  SELECT id FROM purchase_orders WHERE description LIKE '%Cement%'
)
ORDER BY d.created_at DESC;
