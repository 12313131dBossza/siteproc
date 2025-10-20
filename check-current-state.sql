-- Run these one by one and show me the results:

-- 1. Your profile info
SELECT 
  id,
  email,
  full_name,
  role,
  company_id,
  status
FROM profiles 
WHERE email = 'yaibondiseiei@gmail.com';

-- 2. Existing products
SELECT 
  id,
  name,
  category,
  price,
  stock_quantity,
  company_id
FROM products;

-- 3. Existing companies
SELECT * FROM companies;
