-- Check what data should be returned for your user
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  department,
  phone,
  company_id,
  created_at,
  last_login
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE email = 'yaibondiseiei@gmail.com'
);

-- Also check your specific profile
SELECT * FROM profiles WHERE email = 'yaibondiseiei@gmail.com';
