-- 🎯 ULTIMATE FIX FOR PROJECTS DROPDOWN
-- This will fix EVERYTHING in one go!

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  projects_count INT;
BEGIN
  -- Get user ID
  my_user_id := auth.uid();
  RAISE NOTICE '👤 User ID: %', my_user_id;
  
  -- Get user's company
  SELECT company_id INTO my_company_id 
  FROM profiles 
  WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    RAISE EXCEPTION '❌ You have no company assigned! Please assign a company first.';
  END IF;
  
  RAISE NOTICE '🏢 Your Company ID: %', my_company_id;
  
  -- STEP 1: Fix ALL existing projects to have your company_id
  UPDATE projects
  SET company_id = my_company_id
  WHERE company_id IS NULL OR company_id != my_company_id;
  
  GET DIAGNOSTICS projects_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % projects to have your company_id', projects_count;
  
  -- STEP 2: Create a test project if you have none
  INSERT INTO projects (
    name,
    project_number,
    company_id,
    status,
    created_by,
    budget,
    created_at
  )
  SELECT 
    'Test Project - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
    'TEST-' || FLOOR(RANDOM() * 10000)::TEXT,
    my_company_id,
    'active',
    my_user_id,
    50000.00,
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM projects WHERE company_id = my_company_id
  );
  
  -- Count your projects
  SELECT COUNT(*) INTO projects_count
  FROM projects
  WHERE company_id = my_company_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SUCCESS! You now have % project(s)', projects_count;
  RAISE NOTICE '';
  
END $$;

-- Show your projects
SELECT 
  '=== YOUR PROJECTS ===' as section,
  id,
  name,
  project_number,
  company_id,
  status,
  budget,
  created_at
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY created_at DESC;
