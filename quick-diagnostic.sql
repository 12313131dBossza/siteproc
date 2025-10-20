-- =====================================================
-- QUICK DIAGNOSTIC: Check Everything
-- =====================================================

-- 1. Check your profile
SELECT 
  'YOUR PROFILE' as info,
  id,
  email,
  full_name,
  role,
  company_id,
  status
FROM profiles 
WHERE email = 'yaibondiseiei@gmail.com';

-- 2. Check if companies table exists and has data
SELECT 
  'COMPANIES' as info,
  id,
  name,
  created_at
FROM companies 
LIMIT 5;

-- 3. Check existing products
SELECT 
  'PRODUCTS' as info,
  id,
  name,
  category,
  price,
  stock_quantity,
  company_id
FROM products
LIMIT 5;

-- 4. Check if company_id is nullable in products
SELECT 
  'COMPANY_ID COLUMN' as info,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name = 'company_id';

-- =====================================================
-- QUICK FIX: Run these if needed
-- =====================================================

-- If you don't have a company yet, create one:
-- INSERT INTO companies (name) 
-- VALUES ('My Company')
-- RETURNING id, name;

-- Then link your profile to it (replace YOUR_COMPANY_ID):
-- UPDATE profiles 
-- SET company_id = 'YOUR_COMPANY_ID'
-- WHERE email = 'yaibondiseiei@gmail.com';

-- OR: If you want to test without a company, update existing products:
-- UPDATE products SET company_id = NULL;
