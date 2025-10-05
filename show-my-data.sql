-- 🔍 SIMPLE DIAGNOSTIC - Shows what you have without errors
-- Run this to see what's missing

SELECT 'STEP 1: Check Your Profile' as step;

SELECT 
  id as your_user_id,
  company_id,
  role,
  full_name,
  CASE 
    WHEN company_id IS NULL THEN '❌ NO COMPANY ASSIGNED'
    ELSE '✅ Has company'
  END as company_status
FROM profiles
WHERE id = auth.uid();

-- -------------------------------------------

SELECT 'STEP 2: Check Companies' as step;

SELECT 
  id as company_id,
  name as company_name,
  created_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;

-- -------------------------------------------

SELECT 'STEP 3: Check Projects' as step;

SELECT 
  p.id as project_id,
  p.name as project_name,
  p.company_id,
  p.status,
  c.name as company_name
FROM projects p
LEFT JOIN companies c ON c.id = p.company_id
ORDER BY p.created_at DESC
LIMIT 10;

-- -------------------------------------------

SELECT 'STEP 4: Check Your Orders' as step;

SELECT 
  po.id as order_id,
  po.amount,
  po.description,
  po.status,
  po.created_at
FROM purchase_orders po
WHERE po.requested_by = auth.uid()
ORDER BY po.created_at DESC
LIMIT 5;

-- -------------------------------------------

SELECT 'SUMMARY' as step;

SELECT
  (SELECT COUNT(*) FROM profiles WHERE id = auth.uid()) as you_have_profile,
  (SELECT COUNT(*) FROM companies WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as you_have_company,
  (SELECT COUNT(*) FROM projects WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as you_have_projects,
  (SELECT COUNT(*) FROM purchase_orders WHERE requested_by = auth.uid()) as you_have_orders,
  CASE
    WHEN (SELECT company_id FROM profiles WHERE id = auth.uid()) IS NULL THEN '❌ Missing company assignment'
    WHEN (SELECT COUNT(*) FROM projects WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) = 0 THEN '❌ Missing projects'
    ELSE '✅ Ready to create orders!'
  END as next_action;
