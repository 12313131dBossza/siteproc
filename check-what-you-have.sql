-- 🔍 CHECK WHAT YOU'RE MISSING
-- Run this first to see what you have

-- Check 1: Do you have a profile?
SELECT 
  '1. Your Profile' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
  MAX(id)::text as your_user_id,
  MAX(company_id)::text as your_company_id
FROM profiles
WHERE id = auth.uid();

-- Check 2: Do you have a company?
SELECT 
  '2. Your Company' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
  MAX(id)::text as company_id,
  MAX(name) as company_name
FROM companies
WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- Check 3: Do you have projects?
SELECT 
  '3. Your Projects' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS (' || COUNT(*) || ' projects)' ELSE '❌ NO PROJECTS' END as status
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- Check 4: Do you have orders?
SELECT 
  '4. Your Orders' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS (' || COUNT(*) || ' orders)' ELSE '❌ NO ORDERS' END as status
FROM purchase_orders
WHERE requested_by = auth.uid();

-- ===============================================
-- BASED ON RESULTS ABOVE, RUN THE APPROPRIATE FIX:
-- ===============================================

-- If Check 1 shows company_id is NULL, run this:
-- UPDATE profiles SET company_id = (SELECT id FROM companies LIMIT 1) WHERE id = auth.uid();

-- If Check 2 shows MISSING, run this:
-- INSERT INTO companies (name) VALUES ('My Company') RETURNING id;
-- Then copy the ID and run: UPDATE profiles SET company_id = 'PASTE_ID_HERE' WHERE id = auth.uid();

-- If Check 3 shows NO PROJECTS, go to your web app and create a project:
-- https://siteproc1.vercel.app/projects

-- Or create a project with SQL (replace YOUR_COMPANY_ID and YOUR_USER_ID):
-- INSERT INTO projects (name, company_id, status, created_by)
-- VALUES ('My First Project', 'YOUR_COMPANY_ID', 'active', 'YOUR_USER_ID');
