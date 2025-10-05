-- 🔍 WHAT'S IN THE DATABASE RIGHT NOW?

-- 1. Your user and profile
SELECT 
  '1. YOUR PROFILE' as check,
  id as user_id,
  company_id,
  role
FROM profiles
WHERE id = auth.uid();

-- 2. All companies
SELECT 
  '2. ALL COMPANIES' as check,
  id,
  name
FROM companies;

-- 3. ALL projects (regardless of company)
SELECT 
  '3. ALL PROJECTS' as check,
  id,
  name,
  company_id,
  status,
  created_at
FROM projects
ORDER BY created_at DESC;

-- 4. Count everything
SELECT 
  '4. COUNTS' as check,
  (SELECT COUNT(*) FROM companies) as total_companies,
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM profiles WHERE company_id IS NOT NULL) as profiles_with_company;
