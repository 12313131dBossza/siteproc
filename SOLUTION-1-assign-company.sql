-- =====================================================
-- OPTION 1: Assign yourself to a company (RECOMMENDED)
-- =====================================================

-- Step 1: Pick one of your companies (I'll use "My Construction Company")
SELECT id, name FROM companies WHERE name = 'My Construction Company';

-- Step 2: Assign yourself to that company
UPDATE profiles 
SET company_id = (SELECT id FROM companies WHERE name = 'My Construction Company')
WHERE email = 'yaibondiseiei@gmail.com';

-- Step 3: Assign ALL existing products to that same company
UPDATE products 
SET company_id = (SELECT id FROM companies WHERE name = 'My Construction Company')
WHERE company_id IS NULL;

-- Step 4: Verify everything
SELECT 
  p.id,
  p.email,
  p.company_id,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.email = 'yaibondiseiei@gmail.com';

SELECT 
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as products_with_company,
  COUNT(*) FILTER (WHERE company_id IS NULL) as products_without_company
FROM products;
