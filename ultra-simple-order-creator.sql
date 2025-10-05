-- 🎯 ULTRA-SIMPLE ORDER CREATOR
-- This version is foolproof and works step-by-step
-- Run each section separately if needed

-- ==========================================
-- SECTION 1: Check your current setup
-- ==========================================
SELECT 
  'SECTION 1: Your Info' as section,
  prof.id as your_user_id,
  prof.company_id,
  prof.role
FROM profiles prof
WHERE prof.id = auth.uid();

-- ==========================================
-- SECTION 2: Show available projects
-- ==========================================
SELECT 
  'SECTION 2: Your Projects' as section,
  p.id as project_id,
  p.name as project_name,
  p.company_id
FROM projects p
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
LIMIT 10;

-- ==========================================
-- SECTION 3: Create a test order
-- REPLACE 'YOUR_PROJECT_ID_HERE' with an actual project ID from Section 2
-- ==========================================

-- Option A: If you have a project, use this (replace the UUID):
INSERT INTO purchase_orders (
  project_id,
  amount,
  description,
  category,
  status,
  requested_by,
  requested_at
) VALUES (
  'YOUR_PROJECT_ID_HERE'::uuid,  -- REPLACE THIS with a project ID from Section 2
  1500.00,
  'Test Order - Created from SQL',
  'Supplies',
  'pending',
  auth.uid(),
  NOW()
)
RETURNING 
  id as order_id,
  amount,
  description,
  status,
  created_at;

-- ==========================================
-- SECTION 4: Verify the order was created
-- ==========================================
SELECT 
  'SECTION 4: Your Orders' as section,
  po.id,
  po.amount,
  po.description,
  po.status,
  po.created_at
FROM purchase_orders po
WHERE po.requested_by = auth.uid()
ORDER BY po.created_at DESC
LIMIT 5;
