-- Check products table RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY policyname;

-- Check if RLS is enabled on products
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'products';

-- Check your profile to see your role and company_id
SELECT id, email, company_id, role 
FROM public.profiles 
WHERE id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8';

-- Try to select products with your user context
SELECT id, name, category, price, status, company_id, created_at
FROM public.products
ORDER BY created_at DESC
LIMIT 5;
