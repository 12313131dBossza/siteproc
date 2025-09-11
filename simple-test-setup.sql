-- 🚀 SIMPLE PROJECT TESTING - STEP BY STEP
-- Run each section separately to avoid any schema issues

-- ============================================================================
-- STEP 0: CHECK EXISTING DATA FIRST
-- ============================================================================

-- Check if we have products to reference
SELECT 'EXISTING PRODUCTS:' as info, id, name, stock FROM products ORDER BY created_at DESC LIMIT 3;

-- Check if we have users to reference
SELECT 'EXISTING USERS:' as info, id FROM auth.users LIMIT 3;

-- ============================================================================
-- STEP 1: CREATE BASIC TEST DATA
-- ============================================================================

-- Create test products first (since none exist)
INSERT INTO products (name, sku, category, price, stock, unit) VALUES 
('Test Material A', 'TMA-001', 'materials', 100.00, 50, 'kg'),
('Test Equipment B', 'TEB-002', 'equipment', 500.00, 10, 'unit'),
('Test Supply C', 'TSC-003', 'supplies', 25.00, 100, 'box');

-- Create 3 test orders referencing newest 3 products
WITH product_ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) rn
  FROM products
  ORDER BY created_at DESC
  LIMIT 3
)
-- If your orders table requires user_id (error showed NOT NULL on user_id), we include it here.
-- Replace the UUID below with one of the user IDs returned in STEP 0 if different.
-- (Example shown uses first listed user id.)
,
user_cte AS (
  SELECT '73f7a36d-bcc1-4e44-8e55-6ee783dca6a9'::uuid AS user_id
),
status_rows AS (
  VALUES ('pending',1,5), ('approved',2,3), ('rejected',3,2)
)
INSERT INTO orders (status, product_id, qty, user_id)
SELECT 
  sr.column1::order_status AS status,
  pr.id AS product_id,
  sr.column3 AS qty,
  user_cte.user_id
FROM status_rows sr
JOIN product_ranked pr ON pr.rn = sr.column2
CROSS JOIN user_cte;

-- If your column is named created_by instead of user_id, use this variant instead:
-- INSERT INTO orders (status, product_id, qty, created_by)
-- SELECT sr.column1, pr.id, sr.column3, user_cte.user_id
-- FROM status_rows sr
-- JOIN product_ranked pr ON pr.rn = sr.column2
-- CROSS JOIN user_cte;

-- (Optional) Inspect actual orders table columns if still failing:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='orders' ORDER BY ordinal_position;

-- Create 5 test expenses with different amounts and statuses
-- Added spent_at to satisfy NOT NULL constraint on expenses.spent_at
INSERT INTO expenses (amount, status, description, spent_at) VALUES 
(1200.00, 'approved', 'Material Supply Test', now()),
(850.50, 'approved', 'Equipment Rental', now()),
(300.75, 'pending', 'Office Supplies', now()),
(2500.00, 'approved', 'Contractor Payment', now()),
(150.00, 'rejected', 'Rejected Expense', now());

-- If more NOT NULL columns exist (e.g. category, user_id, company_id):
-- Run to inspect: SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name='expenses' ORDER BY ordinal_position;
-- Then extend the column list above and supply values or defaults.

-- Dynamic deliveries seeding block that detects which deliveries schema you have
DO $$
DECLARE
  has_delivered_qty boolean;
  has_status boolean;
  has_total_amount boolean;
  has_product_id boolean;
  v_company uuid;
  v_user uuid := '73f7a36d-bcc1-4e44-8e55-6ee783dca6a9'; -- replace with another user id if needed
  sql_text text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='delivered_qty') INTO has_delivered_qty;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='status') INTO has_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='total_amount') INTO has_total_amount;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='product_id') INTO has_product_id;

  -- Get a company id from profiles if available
  SELECT company_id INTO v_company FROM profiles WHERE company_id IS NOT NULL LIMIT 1;

  IF v_company IS NULL THEN
    RAISE NOTICE 'No company_id found in profiles. Skipping deliveries seed.';
    RETURN;
  END IF;

  -- Prepare a temp orders set
  CREATE TEMP TABLE tmp_orders_seed AS
  SELECT id AS order_id, product_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) rn
  FROM orders
  LIMIT 3;

  IF (SELECT COUNT(*) FROM tmp_orders_seed) = 0 THEN
    RAISE NOTICE 'No orders available to seed deliveries.';
    RETURN;
  END IF;

  -- Decide insertion form
  IF has_delivered_qty AND has_status AND has_product_id THEN
    sql_text := $$INSERT INTO deliveries (order_id, product_id, delivered_qty, status, company_id, created_by)
      SELECT order_id, product_id,
             CASE rn WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
             CASE rn WHEN 1 THEN 'pending' WHEN 2 THEN 'partial' ELSE 'delivered' END,
             $1, $2 FROM tmp_orders_seed$$;
  ELSIF has_delivered_qty AND NOT has_status AND has_product_id THEN
    sql_text := $$INSERT INTO deliveries (order_id, product_id, delivered_qty, company_id, created_by)
      SELECT order_id, product_id,
             CASE rn WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
             $1, $2 FROM tmp_orders_seed$$;
  ELSIF NOT has_delivered_qty AND has_status AND has_total_amount THEN
    sql_text := $$INSERT INTO deliveries (order_id, status, company_id, created_by, total_amount)
      SELECT order_id,
             CASE rn WHEN 1 THEN 'pending' WHEN 2 THEN 'in_transit' ELSE 'delivered' END,
             $1, $2, 0 FROM tmp_orders_seed$$;
  ELSE
    RAISE NOTICE 'Deliveries schema not matched by auto-seed logic. Columns present: delivered_qty=%, status=%, total_amount=%, product_id=%',
      has_delivered_qty, has_status, has_total_amount, has_product_id;
    RETURN;
  END IF;

  EXECUTE sql_text USING v_company, v_user;
  RAISE NOTICE 'Deliveries seeded successfully.';
END $$;

-- ============================================================================
-- STEP 2: GET TEST DATA IDs (Run this to get IDs for manual testing)
-- ============================================================================

-- Get existing orders for testing
SELECT 'ORDERS TO TEST WITH:' as info, id, status, project_id, product_id
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Get your latest expenses (copy these IDs for testing)
SELECT 'EXPENSES TO TEST WITH:' as info, id, amount, status, project_id, description
FROM expenses 
ORDER BY created_at DESC 
LIMIT 5;

-- Get your latest deliveries (copy these IDs for testing)
SELECT 'DELIVERIES TO TEST WITH:' as info, id, status, project_id
FROM deliveries 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================================================
-- STEP 3: YOUR TEST PROJECT INFO
-- ============================================================================

SELECT 'YOUR TEST PROJECT:' as info, id, name, budget, status
FROM projects 
WHERE id = '96abb85f-5920-4ce9-9966-90411a660aac';
