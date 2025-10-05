-- 🔍 CHECK WHAT ORDERS EXIST IN DATABASE

-- 1. Check purchase_orders table
SELECT 
  '=== PURCHASE ORDERS ===' as check,
  id,
  project_id,
  amount,
  description,
  category,
  status,
  requested_by,
  requested_at,
  created_at
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if your project has orders
SELECT 
  '=== ORDERS FOR YOUR PROJECT ===' as check,
  po.id,
  po.amount,
  po.description,
  po.status,
  po.created_at,
  p.name as project_name,
  p.company_id
FROM purchase_orders po
JOIN projects p ON p.id = po.project_id
WHERE p.company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid
ORDER BY po.created_at DESC;

-- 3. Count everything
SELECT 
  '=== COUNTS ===' as check,
  (SELECT COUNT(*) FROM purchase_orders) as total_purchase_orders,
  (SELECT COUNT(*) FROM purchase_orders WHERE project_id IN (
    SELECT id FROM projects WHERE company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid
  )) as your_company_orders;
