-- ============================================
-- SIMPLE 3-STEP DELIVERY CREATION
-- ============================================

-- ========================================
-- STEP 1: RUN THIS to find your order UUID
-- ========================================
SELECT 
  purchase_orders.id as order_uuid,
  purchase_orders.description,
  purchase_orders.amount,
  purchase_orders.delivery_progress,
  projects.name as project_name
FROM purchase_orders
LEFT JOIN projects ON projects.id = purchase_orders.project_id
WHERE purchase_orders.description LIKE '%Cement%'
ORDER BY purchase_orders.created_at DESC
LIMIT 5;

-- Copy the 'order_uuid' value from the results above!
-- Example: 12345678-1234-1234-1234-123456789abc


-- ========================================
-- STEP 2: RUN THIS to find your company_id
-- ========================================
SELECT 
  id as user_id,
  full_name,
  company_id,
  role
FROM profiles
LIMIT 5;

-- Copy the 'company_id' value from the results above!
-- Example: 87654321-4321-4321-4321-210987654321


-- ========================================
-- STEP 3: PASTE YOUR VALUES HERE AND RUN
-- ========================================
-- IMPORTANT: Replace the text below with the UUIDs you copied!
-- Change this line: v_order_uuid UUID := 'paste-order-uuid-here';
-- Change this line: v_company_id UUID := 'paste-company-id-here';

DO $$
DECLARE
  v_order_uuid UUID := '49fd1a08-a4f2-401f-9468-26c4b665f287'; -- ← Your 10-bag cement order
  v_company_id UUID := '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'; -- ← Your company ID
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
    'delivered',
    'John Doe',
    'TRK-123',
    'Partial delivery of Portland Cement (5 bags)',
    62.50,
    v_company_id,
    NOW()
  )
  RETURNING id INTO v_delivery_id;

  RAISE NOTICE '✅ Delivery created! ID: %', v_delivery_id;

  -- Create delivery items
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
    5.00,
    'bags',
    12.50,
    62.50,
    NOW()
  );

  RAISE NOTICE '✅ Delivery items created!';
  RAISE NOTICE '🎉 DONE! Your order should now show "Partially Delivered"!';
END $$;


-- ========================================
-- STEP 4: RUN THIS to verify it worked!
-- ========================================
SELECT 
  purchase_orders.id,
  purchase_orders.description,
  purchase_orders.delivery_progress as status,
  purchase_orders.ordered_qty as ordered,
  purchase_orders.delivered_qty as delivered,
  purchase_orders.remaining_qty as remaining,
  purchase_orders.delivered_value
FROM purchase_orders
WHERE purchase_orders.description LIKE '%Cement%'
ORDER BY purchase_orders.created_at DESC
LIMIT 1;

-- View the delivery
SELECT 
  d.delivery_date,
  d.status,
  d.driver_name,
  di.product_name,
  di.quantity,
  di.unit,
  di.unit_price
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
WHERE d.order_uuid IN (
  SELECT purchase_orders.id FROM purchase_orders WHERE purchase_orders.description LIKE '%Cement%'
)
ORDER BY d.created_at DESC;
