-- 🎯 COMPLETE SETUP: Company + Projects
-- This will set up EVERYTHING from scratch!

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  my_project_id UUID;
  projects_count INT;
BEGIN
  -- Get user ID
  my_user_id := auth.uid();
  RAISE NOTICE '👤 User ID: %', my_user_id;
  
  -- STEP 1: Get or create a company
  SELECT id INTO my_company_id FROM companies LIMIT 1;
  
  IF my_company_id IS NULL THEN
    INSERT INTO companies (name, created_at)
    VALUES ('Default Company', NOW())
    RETURNING id INTO my_company_id;
    RAISE NOTICE '✅ Created new company: %', my_company_id;
  ELSE
    RAISE NOTICE '✅ Found existing company: %', my_company_id;
  END IF;
  
  -- STEP 2: Assign company to your profile
  UPDATE profiles 
  SET company_id = my_company_id
  WHERE id = my_user_id;
  
  RAISE NOTICE '✅ Assigned company to your profile';
  
  -- STEP 3: Fix ALL existing projects to have this company_id
  UPDATE projects
  SET company_id = my_company_id
  WHERE company_id IS NULL OR company_id != my_company_id;
  
  GET DIAGNOSTICS projects_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % existing projects', projects_count;
  
  -- STEP 4: Count how many projects you have now
  SELECT COUNT(*) INTO projects_count
  FROM projects
  WHERE company_id = my_company_id;
  
  RAISE NOTICE '📊 You now have % project(s)', projects_count;
  
  -- STEP 5: Create a test project if you have none
  IF projects_count = 0 THEN
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
    
    RAISE NOTICE '✅ Created new project: %', my_project_id;
    projects_count := 1;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉 COMPLETE SUCCESS! 🎉🎉🎉';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Company: %', my_company_id;
  RAISE NOTICE '✅ Total Projects: %', projects_count;
  RAISE NOTICE '';
  RAISE NOTICE '👉 Now refresh the page: https://siteproc1.vercel.app/orders/new';
  RAISE NOTICE '';
  
END $$;

-- Verify everything is set up correctly
SELECT '=== 1. YOUR PROFILE ===' as section;
SELECT 
  id,
  company_id,
  role,
  full_name
FROM profiles
WHERE id = auth.uid();

SELECT '=== 2. YOUR COMPANY ===' as section;
SELECT 
  c.id,
  c.name,
  c.created_at
FROM companies c
JOIN profiles p ON p.company_id = c.id
WHERE p.id = auth.uid();

SELECT '=== 3. YOUR PROJECTS ===' as section;
SELECT 
  p.id,
  p.name,
  p.status,
  p.budget,
  p.company_id,
  p.created_at
FROM projects p
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY p.created_at DESC;
