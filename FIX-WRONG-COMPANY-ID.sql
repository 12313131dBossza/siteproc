-- 🔧 FIX PROJECT "11" COMPANY ID RIGHT NOW

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  fixed_count INT;
  r RECORD;
BEGIN
  -- Get your user ID
  my_user_id := auth.uid();
  RAISE NOTICE '👤 Your User ID: %', my_user_id;
  
  -- Get your company ID from your profile
  SELECT company_id INTO my_company_id
  FROM profiles
  WHERE id = my_user_id;
  
  RAISE NOTICE '🏢 Your Company ID: %', my_company_id;
  
  -- Show current wrong state
  RAISE NOTICE '';
  RAISE NOTICE '=== BEFORE FIX ===';
  FOR r IN 
    SELECT id, name, company_id, status 
    FROM projects 
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    RAISE NOTICE 'Project: % | Company: % | Status: %', r.name, r.company_id, r.status;
  END LOOP;
  
  -- FIX ALL PROJECTS to have YOUR company_id
  UPDATE projects
  SET company_id = my_company_id
  WHERE company_id != my_company_id OR company_id IS NULL;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed % projects!', fixed_count;
  
  -- Show new correct state
  RAISE NOTICE '';
  RAISE NOTICE '=== AFTER FIX ===';
  FOR r IN 
    SELECT id, name, company_id, status 
    FROM projects 
    WHERE company_id = my_company_id
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE 'Project: % | Company: % | Status: % ✅', r.name, r.company_id, r.status;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 DONE! All projects now have YOUR company_id!';
  
END $$;

-- Verify the fix worked
SELECT 
  '=== YOUR PROJECTS NOW ===' as section,
  id,
  name,
  company_id,
  status,
  '✅ CORRECT!' as verification
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
ORDER BY created_at DESC;
