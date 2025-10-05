-- ✅ ALL-IN-ONE FIX - Run this single script to fix everything
-- This creates company, updates profile, shows you how to create project

-- PART 1: Fix your company assignment
DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
BEGIN
  my_user_id := auth.uid();
  
  -- Get or create company
  SELECT id INTO my_company_id FROM companies LIMIT 1;
  
  IF my_company_id IS NULL THEN
    INSERT INTO companies (name) VALUES ('My Company')
    RETURNING id INTO my_company_id;
    RAISE NOTICE '✅ Created company: %', my_company_id;
  ELSE
    RAISE NOTICE '✅ Found company: %', my_company_id;
  END IF;
  
  -- Update your profile
  UPDATE profiles SET company_id = my_company_id WHERE id = my_user_id;
  RAISE NOTICE '✅ Updated your profile';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Your User ID: %', my_user_id;
  RAISE NOTICE 'Your Company ID: %', my_company_id;
  RAISE NOTICE '========================================';
  
END $$;

-- Show your updated profile
SELECT 
  '1️⃣ Your Profile (FIXED)' as step,
  id,
  company_id,
  role
FROM profiles
WHERE id = auth.uid();

-- Show your company
SELECT 
  '2️⃣ Your Company' as step,
  id,
  name
FROM companies
WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- Check if you have projects
SELECT 
  '3️⃣ Your Projects' as step,
  COUNT(*) as project_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO PROJECTS - Create one below!'
    ELSE '✅ You have projects'
  END as status
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- If you have projects, try to create an order
DO $$
DECLARE
  my_project_id UUID;
  new_order_id UUID;
BEGIN
  -- Get a project
  SELECT id INTO my_project_id 
  FROM projects 
  WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  LIMIT 1;
  
  IF my_project_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NO PROJECTS FOUND!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Go to: https://siteproc1.vercel.app/projects';
    RAISE NOTICE '📝 Click "Create Project" or "New Project"';
    RAISE NOTICE '📝 Then come back and run this script again!';
    RAISE NOTICE '';
  ELSE
    -- Create an order!
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
      auth.uid(),
      NOW()
    )
    RETURNING id INTO new_order_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉🎉🎉 SUCCESS! 🎉🎉🎉';
    RAISE NOTICE 'Created order: %', new_order_id;
    RAISE NOTICE '';
    RAISE NOTICE '👉 Go to: https://siteproc1.vercel.app/orders';
    RAISE NOTICE '👉 Press F5 to refresh!';
    RAISE NOTICE '';
  END IF;
END $$;

-- Show orders if any were created
SELECT 
  '4️⃣ Your Orders' as step,
  id,
  amount,
  description,
  status,
  created_at
FROM purchase_orders
WHERE requested_by = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
