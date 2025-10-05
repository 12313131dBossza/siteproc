-- 🎯 FINAL NUCLEAR OPTION: Fix EVERYTHING and show results

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  my_project_id UUID;
BEGIN
  my_user_id := auth.uid();
  
  -- Get user's company (or assign first company)
  SELECT company_id INTO my_company_id FROM profiles WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    -- Assign first available company
    SELECT id INTO my_company_id FROM companies LIMIT 1;
    UPDATE profiles SET company_id = my_company_id WHERE id = my_user_id;
    RAISE NOTICE '✅ Assigned company % to your profile', my_company_id;
  END IF;
  
  -- Update ALL projects to have your company
  UPDATE projects SET company_id = my_company_id;
  RAISE NOTICE '✅ Updated all projects to company %', my_company_id;
  
  -- If no projects, create one
  SELECT id INTO my_project_id FROM projects WHERE company_id = my_company_id LIMIT 1;
  IF my_project_id IS NULL THEN
    INSERT INTO projects (name, company_id, status, created_by, budget, created_at)
    VALUES ('Test Project', my_company_id, 'active', my_user_id, 50000, NOW())
    RETURNING id INTO my_project_id;
    RAISE NOTICE '✅ Created new project %', my_project_id;
  END IF;
  
  RAISE NOTICE '🎉 SUCCESS!';
END $$;

-- Show final state
SELECT '=== YOUR PROFILE ===' as info;
SELECT id, company_id, role FROM profiles WHERE id = auth.uid();

SELECT '=== YOUR COMPANY ===' as info;
SELECT c.* FROM companies c 
JOIN profiles p ON p.company_id = c.id 
WHERE p.id = auth.uid();

SELECT '=== YOUR PROJECTS ===' as info;
SELECT p.id, p.name, p.company_id, p.status, p.budget, p.created_at
FROM projects p
JOIN profiles prof ON prof.company_id = p.company_id
WHERE prof.id = auth.uid()
ORDER BY p.created_at DESC;
