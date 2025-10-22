-- DEBUG: Check your profile and test product insert
-- Run this in Supabase SQL Editor

-- 1. Check your profile
SELECT 
  id,
  email,
  company_id,
  role,
  CASE 
    WHEN company_id IS NULL THEN '❌ NULL - This is the problem!'
    ELSE '✅ Has company_id'
  END as company_status
FROM profiles 
WHERE id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8';

-- 2. Check if your company exists
SELECT 
  id,
  name,
  created_at
FROM companies
WHERE id = (
  SELECT company_id 
  FROM profiles 
  WHERE id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'
);

-- 3. Try to insert a test product directly (bypass RLS with admin)
-- This will tell us if the INSERT works at all
INSERT INTO products (
  name,
  category,
  price,
  unit,
  stock_quantity,
  min_stock_level,
  description,
  status,
  company_id,
  created_by,
  created_at
) VALUES (
  'TEST PRODUCT - Manual Insert',
  'Steel & Metal',
  99.99,
  'pcs',
  100,
  20,
  'Test product inserted directly via SQL',
  'active',
  (SELECT company_id FROM profiles WHERE id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8'),
  '12bba0f7-32fd-4784-a4ae-4f6defcd77e8',
  NOW()
) RETURNING id, name, company_id, status;

-- 4. Verify the product was inserted
SELECT 
  id,
  name,
  company_id,
  status,
  created_by,
  created_at
FROM products
WHERE name = 'TEST PRODUCT - Manual Insert'
ORDER BY created_at DESC
LIMIT 1;
