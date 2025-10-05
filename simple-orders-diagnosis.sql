-- 🔍 SIMPLE ORDERS DIAGNOSIS
-- Run this in Supabase SQL Editor
-- This script avoids any column that might not exist

-- Step 1: Check which tables have data
SELECT '=== TABLE DATA COUNT ===' as step;

SELECT 
  'purchase_orders' as table_name,
  COUNT(*) as row_count
FROM purchase_orders;

SELECT 
  'orders' as table_name,
  COUNT(*) as row_count
FROM orders;

-- Step 2: Check your user info (using only columns that definitely exist)
SELECT '=== YOUR USER INFO ===' as step;

SELECT 
  prof.id as profile_id,
  prof.company_id,
  prof.role,
  prof.full_name
FROM profiles prof
WHERE prof.id = auth.uid();

-- Step 3: Check your projects
SELECT '=== YOUR PROJECTS ===' as step;

SELECT 
  p.id,
  p.name,
  p.company_id
FROM projects p
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.id = auth.uid()
LIMIT 10;

-- Step 4: Check purchase_orders data
SELECT '=== DATA IN PURCHASE_ORDERS ===' as step;

SELECT 
  po.id,
  po.amount,
  po.description,
  po.status,
  po.project_id,
  po.created_at
FROM purchase_orders po
ORDER BY po.created_at DESC
LIMIT 10;

-- Step 5: Check if you can see purchase_orders with RLS
SELECT '=== YOUR ACCESSIBLE PURCHASE_ORDERS ===' as step;

SELECT 
  po.id,
  po.amount,
  po.description,
  po.status,
  p.name as project_name,
  po.created_at
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.id = auth.uid()
ORDER BY po.created_at DESC;

-- Step 6: Diagnostic summary
SELECT '=== DIAGNOSTIC SUMMARY ===' as step;

SELECT
  (SELECT COUNT(*) FROM purchase_orders) as total_purchase_orders,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM projects WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())) as your_projects,
  (SELECT company_id FROM profiles WHERE id = auth.uid()) as your_company_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as your_role;
