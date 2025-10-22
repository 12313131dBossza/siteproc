-- 🔍 DIAGNOSE: Why orders aren't showing in dropdown
-- This checks if there's a company_id mismatch

-- 1. Check your profile
SELECT 
  '=== YOUR PROFILE ===' as section,
  id as user_id,
  email,
  company_id as your_company_id,
  role
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- 2. Check the project's company
SELECT 
  '=== PROJECT COMPANY ===' as section,
  id as project_id,
  name as project_name,
  code,
  company_id as project_company_id
FROM projects
WHERE code = 'PROJ-2025-001';

-- 3. Check purchase orders and their project companies
SELECT 
  '=== PURCHASE ORDERS ===' as section,
  po.id as order_id,
  po.description,
  po.status,
  po.project_id,
  p.name as project_name,
  p.company_id as project_company_id
FROM purchase_orders po
LEFT JOIN projects p ON p.id = po.project_id
WHERE p.code = 'PROJ-2025-001';

-- 4. The critical check: Does your company_id match the project's company_id?
SELECT 
  '=== COMPANY MATCH CHECK ===' as section,
  prof.email,
  prof.company_id as user_company_id,
  p.company_id as project_company_id,
  CASE 
    WHEN prof.company_id = p.company_id THEN '✅ MATCH - Orders should be visible'
    WHEN prof.company_id IS NULL THEN '❌ PROBLEM: User has no company_id!'
    WHEN p.company_id IS NULL THEN '❌ PROBLEM: Project has no company_id!'
    ELSE '❌ MISMATCH - Orders will NOT be visible!'
  END as diagnosis
FROM profiles prof
CROSS JOIN projects p
WHERE prof.email = 'yaibondiseiei@gmail.com'
  AND p.code = 'PROJ-2025-001';

-- 5. Count orders that SHOULD be visible to you
SELECT 
  '=== VISIBILITY TEST ===' as section,
  COUNT(*) as orders_visible_to_you,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO ORDERS VISIBLE - Check company_id mismatch above'
    ELSE '✅ Orders exist and should be visible'
  END as result
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.email = 'yaibondiseiei@gmail.com';
