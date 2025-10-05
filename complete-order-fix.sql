-- 🔧 COMPLETE FIX: Create Everything You Need
-- This script will create a company, project, and order if you don't have them
-- Run this if you're starting from scratch

-- ALL STEPS IN ONE TRANSACTION
DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  my_project_id UUID;
  new_order_id UUID;
BEGIN
  -- Get current user ID
  my_user_id := auth.uid();
  RAISE NOTICE '👤 Your user ID: %', my_user_id;
  
  -- ==========================================
  -- STEP 1: Ensure you have a company
  -- ==========================================
  SELECT company_id INTO my_company_id
  FROM profiles
  WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    RAISE NOTICE '⚠️  No company found. Creating one...';
    
    -- Create a company
    INSERT INTO companies (name)
    VALUES ('My Test Company - ' || to_char(NOW(), 'YYYY-MM-DD'))
    RETURNING id INTO my_company_id;
    
    RAISE NOTICE '✅ Created company: %', my_company_id;
    
    -- Update profile with company_id
    UPDATE profiles
    SET company_id = my_company_id
    WHERE id = my_user_id;
    
    RAISE NOTICE '✅ Updated your profile with company_id';
  ELSE
    RAISE NOTICE '✅ You already have company: %', my_company_id;
  END IF;
  
  -- ==========================================
  -- STEP 2: Ensure you have a project
  -- ==========================================
  SELECT id INTO my_project_id
  FROM projects
  WHERE company_id = my_company_id
  LIMIT 1;
  
  IF my_project_id IS NULL THEN
    RAISE NOTICE '⚠️  No project found.';
    RAISE EXCEPTION 'You need to create a project first! Go to your web app and create a project, or create one manually in SQL.';
  ELSE
    RAISE NOTICE '✅ Using existing project: %', my_project_id;
  END IF;
  
  -- ==========================================
  -- STEP 3: Create a test order
  -- ==========================================
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
    my_user_id,
    NOW()
  )
  RETURNING id INTO new_order_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SUCCESS! Created order: %', new_order_id;
  RAISE NOTICE '👉 Refresh your orders page now!';
  RAISE NOTICE '';
  
END $$;

-- ==========================================
-- STEP 4: Verify everything
-- ==========================================
SELECT '=== YOUR SETUP ===' as section;

SELECT 
  'Company' as type,
  c.id,
  c.name
FROM companies c
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid());

SELECT 
  'Projects' as type,
  p.id,
  p.name
FROM projects p
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

SELECT 
  'Orders' as type,
  po.id,
  po.amount,
  po.description,
  po.status,
  po.created_at
FROM purchase_orders po
WHERE po.requested_by = auth.uid()
ORDER BY po.created_at DESC;
