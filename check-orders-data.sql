-- 🔍 CHECK ORDERS DATA - Find out where your orders are
-- Run this in Supabase SQL Editor to see what data exists

-- Check if purchase_orders table exists and has data
SELECT 
  'purchase_orders table' as table_name,
  COUNT(*) as row_count
FROM purchase_orders;

-- Check if orders table exists and has data
SELECT 
  'orders table' as table_name,
  COUNT(*) as row_count
FROM orders;

-- Show actual data in purchase_orders
SELECT 
  'Data in purchase_orders:' as info;
SELECT 
  id,
  project_id,
  amount,
  description,
  category,
  status,
  requested_by,
  created_at
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 10;

-- Show actual data in orders
SELECT 
  'Data in orders:' as info;
SELECT 
  id,
  project_id,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- Check your profile and company
SELECT 
  'Your profile:' as info;
SELECT 
  id,
  full_name,
  email,
  company_id,
  role
FROM profiles
WHERE id = auth.uid()
LIMIT 1;

-- Check your projects
SELECT 
  'Your projects:' as info;
SELECT 
  p.id,
  p.name,
  p.company_id,
  c.name as company_name
FROM projects p
INNER JOIN companies c ON c.id = p.company_id
INNER JOIN profiles prof ON prof.company_id = c.id
WHERE prof.id = auth.uid()
ORDER BY p.created_at DESC
LIMIT 10;
