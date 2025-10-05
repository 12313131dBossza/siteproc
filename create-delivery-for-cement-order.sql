-- Create a Delivery for the Portland Cement Order
-- This will automatically update the order's delivery progress!

-- Step 1: Find your cement order
-- Run this first to get your order's UUID
SELECT 
  id as order_uuid,
  description,
  amount,
  status,
  delivery_progress,
  ordered_qty,
  delivered_qty,
  remaining_qty,
  created_at
FROM purchase_orders
WHERE description LIKE '%Cement%'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Create a delivery record
-- REPLACE 'YOUR-ORDER-UUID-HERE' with the actual UUID from Step 1
-- REPLACE 'YOUR-COMPANY-ID-HERE' with your company_id from profiles table

-- First, get your company_id:
SELECT 
  id as user_id,
  email,
  company_id,
  role
FROM profiles
LIMIT 5;

-- Now create the delivery:
-- IMPORTANT: Replace the placeholder values below!
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
  'YOUR-ORDER-UUID-HERE',  -- ← Replace with your order's UUID from Step 1
  NOW(),                     -- Today's date
  'delivered',               -- Status: 'delivered' or 'pending'
  'John Doe',                -- Driver name
  'TRK-123',                 -- Vehicle number
  'Delivery of Portland Cement bags',  -- Notes
  0,                         -- Total amount (will be calculated from items)
  'YOUR-COMPANY-ID-HERE',    -- ← Replace with your company_id from profiles
  NOW()
)
RETURNING id, order_uuid, delivery_date, status;

-- Step 3: Add delivery items
-- REPLACE 'YOUR-DELIVERY-ID-HERE' with the ID returned from Step 2
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
  'YOUR-DELIVERY-ID-HERE',   -- ← Replace with delivery ID from Step 2
  'Portland Cement',
  5,                          -- Delivering 5 bags (partial delivery)
  'bags',
  12.50,                      -- Price per bag
  62.50,                      -- Total: 5 × $12.50
  NOW()
)
RETURNING *;

-- Step 4: Verify the order was updated automatically!
-- This should show delivery_progress = 'partially_delivered' and delivered_qty = 5
SELECT 
  id,
  description,
  delivery_progress,
  ordered_qty,
  delivered_qty,
  remaining_qty,
  delivered_value
FROM purchase_orders
WHERE description LIKE '%Cement%'
ORDER BY created_at DESC
LIMIT 1;

-- 🎉 SUCCESS! Your order should now show as "Partially Delivered" with a BLUE badge!
