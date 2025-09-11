-- Simple order creation for project: 96abb05f-5920-4ce9-9066-90411a660aac
-- Run this in Supabase SQL Editor

-- Step 1: Ensure a product exists
INSERT INTO products (id, name, sku, price, stock, unit)
SELECT gen_random_uuid(), 'MOCK TEST PRODUCT', 'MOCK-SKU', 12.34, 100, 'unit'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE stock > 0);

-- Step 2: Create order with minimal columns (no user/company dependencies)
WITH prod AS (
  SELECT id FROM products WHERE stock > 0 ORDER BY created_at DESC LIMIT 1
)
INSERT INTO orders (id, product_id, qty, status, project_id)
SELECT gen_random_uuid(), prod.id, 1, 'pending', '96abb05f-5920-4ce9-9066-90411a660aac'::uuid
FROM prod
RETURNING id as order_id, project_id;

-- Step 3: Verify the order exists
SELECT 
  'SUCCESS' as result,
  id as order_id, 
  status, 
  project_id, 
  created_at
FROM orders 
WHERE project_id = '96abb05f-5920-4ce9-9066-90411a660aac'::uuid
ORDER BY created_at DESC 
LIMIT 1;
