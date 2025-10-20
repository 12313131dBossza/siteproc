-- First, verify your profile is correctly assigned
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.company_id,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.email = 'yaibondiseiei@gmail.com';

-- Verify products belong to your company
SELECT 
  id,
  name,
  category,
  price,
  stock_quantity,
  company_id
FROM products
WHERE company_id = (
  SELECT company_id FROM profiles WHERE email = 'yaibondiseiei@gmail.com'
)
ORDER BY created_at DESC;

-- Count how many products you SHOULD see
SELECT 
  'Products you should see:' as info,
  COUNT(*) as count
FROM products
WHERE company_id = (
  SELECT company_id FROM profiles WHERE email = 'yaibondiseiei@gmail.com'
);
