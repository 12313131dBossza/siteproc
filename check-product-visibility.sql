-- Check which products have NULL company_id vs assigned company_id
SELECT 
  id,
  name,
  category,
  price,
  stock_quantity,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '✅ VISIBLE (no company)'
    ELSE '❌ HIDDEN (has company)'
  END as visibility_status
FROM products
ORDER BY company_id NULLS FIRST;

-- Count products by company_id
SELECT 
  CASE 
    WHEN company_id IS NULL THEN 'No Company (NULL)'
    ELSE company_id::text
  END as company,
  COUNT(*) as product_count
FROM products
GROUP BY company_id
ORDER BY company_id NULLS FIRST;

-- Your profile company_id
SELECT 
  id,
  email,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '⚠️ Not assigned to any company'
    ELSE '✅ Assigned to company: ' || company_id::text
  END as status
FROM profiles 
WHERE email = 'yaibondiseiei@gmail.com';
