-- =====================================================
-- Setup Company for Current User
-- =====================================================

-- First, check what columns the companies table actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Check if you already have a company
SELECT * FROM companies LIMIT 5;

-- Check your current profile
SELECT id, email, full_name, company_id, role 
FROM profiles 
WHERE email = 'yaibondiseiei@gmail.com';

-- Option 1: Create a new company (adjust columns based on what exists)
-- Common columns are usually: id, name, created_at, updated_at
INSERT INTO companies (name) 
VALUES ('My Construction Company')
ON CONFLICT DO NOTHING
RETURNING id, name;

-- Option 2: If a company already exists, get its ID
-- Then update your profile to link to it
UPDATE profiles 
SET company_id = (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1)
WHERE email = 'yaibondiseiei@gmail.com'
RETURNING id, email, company_id;

-- Verify the update
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
