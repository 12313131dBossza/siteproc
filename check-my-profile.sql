-- Check your profile data including company_id
SELECT 
  id,
  email,
  role,
  company_id,
  full_name,
  status,
  created_at
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- Also check if you have a company
SELECT * FROM companies LIMIT 5;
