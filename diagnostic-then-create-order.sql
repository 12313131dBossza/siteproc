-- 🎯 SIMPLEST FIX: Just use existing data or show what's missing
-- Run this to diagnose and fix your orders issue

-- ==========================================
-- STEP 1: Check what you have
-- ==========================================
SELECT '=== DIAGNOSTIC INFO ===' as step;

-- Your profile
SELECT 
  'Your Profile' as info,
  id,
  company_id,
  role,
  full_name
FROM profiles
WHERE id = auth.uid();

-- Your company
SELECT 
  'Your Company' as info,
  c.id,
  c.name
FROM companies c
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- Your projects
SELECT 
  'Your Projects' as info,
  p.id,
  p.name,
  p.status
FROM projects p
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- STEP 2: If you have a project, create order
-- ONLY RUN THIS IF STEP 1 SHOWS YOU HAVE PROJECTS
-- ==========================================

-- Uncomment and run this if you saw projects in Step 1:
/*
DO $$
DECLARE
  my_project_id UUID;
  new_order_id UUID;
BEGIN
  -- Get your first project
  SELECT id INTO my_project_id
  FROM projects
  WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  LIMIT 1;
  
  IF my_project_id IS NULL THEN
    RAISE EXCEPTION 'No project found! Create a project first from the web UI.';
  END IF;
  
  -- Create order
  INSERT INTO purchase_orders (
    project_id,
    amount,
    description,
    category,
    status,
    requested_by,
    requested_at
  ) VALUES (
    my_project_id,
    2500.00,
    'Test Order - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
    'Supplies',
    'pending',
    auth.uid(),
    NOW()
  )
  RETURNING id INTO new_order_id;
  
  RAISE NOTICE '🎉 SUCCESS! Created order: %', new_order_id;
END $$;
*/

-- ==========================================
-- STEP 3: View your orders
-- ==========================================
SELECT 
  'Your Orders' as info,
  po.id,
  po.amount,
  po.description,
  po.status,
  po.created_at
FROM purchase_orders po
WHERE po.requested_by = auth.uid()
ORDER BY po.created_at DESC;
