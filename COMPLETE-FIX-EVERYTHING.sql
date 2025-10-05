-- ✅ COMPLETE FIX - All in one go
-- This will fix EVERYTHING: company, profile, project, and create a test order

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  my_project_id UUID;
  new_order_id UUID;
BEGIN
  -- Get user ID
  my_user_id := auth.uid();
  RAISE NOTICE '👤 User ID: %', my_user_id;
  
  -- STEP 1: Get or create company
  SELECT id INTO my_company_id FROM companies LIMIT 1;
  
  IF my_company_id IS NULL THEN
    INSERT INTO companies (name) 
    VALUES ('My Company')
    RETURNING id INTO my_company_id;
    RAISE NOTICE '✅ Created company: %', my_company_id;
  ELSE
    RAISE NOTICE '✅ Found company: %', my_company_id;
  END IF;
  
  -- STEP 2: Update profile with company
  UPDATE profiles 
  SET company_id = my_company_id 
  WHERE id = my_user_id;
  RAISE NOTICE '✅ Updated profile with company';
  
  -- STEP 3: Create project (with only the fields that exist)
  INSERT INTO projects (
    name,
    company_id,
    status,
    created_by,
    budget,
    created_at
  ) VALUES (
    'Main Project',
    my_company_id,
    'active',
    my_user_id,
    100000.00,
    NOW()
  )
  RETURNING id INTO my_project_id;
  RAISE NOTICE '✅ Created project: %', my_project_id;
  
  -- STEP 4: Create test order
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
    'Equipment',
    'pending',
    my_user_id,
    NOW()
  )
  RETURNING id INTO new_order_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉 COMPLETE SUCCESS! 🎉🎉🎉';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Company: %', my_company_id;
  RAISE NOTICE '✅ Project: %', my_project_id;
  RAISE NOTICE '✅ Order: %', new_order_id;
  RAISE NOTICE '';
  RAISE NOTICE '👉 Go to: https://siteproc1.vercel.app/orders';
  RAISE NOTICE '👉 Press F5 to refresh!';
  RAISE NOTICE '👉 Your order should appear!';
  RAISE NOTICE '';
  
END $$;

-- Verify everything
SELECT '=== VERIFICATION ===' as section;

SELECT 
  '1. Your Profile' as check_name,
  id,
  company_id,
  role
FROM profiles
WHERE id = auth.uid();

SELECT 
  '2. Your Company' as check_name,
  id,
  name
FROM companies
WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid());

SELECT 
  '3. Your Projects' as check_name,
  id,
  name,
  status,
  budget
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

SELECT 
  '4. Your Orders' as check_name,
  id,
  amount,
  description,
  status,
  created_at
FROM purchase_orders
WHERE requested_by = auth.uid()
ORDER BY created_at DESC;
