-- 🎯 CREATE PROJECT WITH YOUR EXACT COMPANY ID
-- Your company_id: 1e2e7ccf-29fa-4511-b0d3-93c8347ead33

DO $$
DECLARE
  my_project_id UUID;
BEGIN
  -- Create a new project with YOUR company_id
  INSERT INTO projects (
    name,
    company_id,
    status,
    created_by,
    budget,
    created_at
  ) VALUES (
    'Main Project',
    '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid,  -- Your exact company_id
    'active',
    'f34e5416-505a-42b3-a9af-74330c91e05b'::uuid,  -- Your user_id
    50000.00,
    NOW()
  )
  RETURNING id INTO my_project_id;
  
  RAISE NOTICE '✅ Created project: %', my_project_id;
  RAISE NOTICE '🎉 SUCCESS! Project created with your company_id!';
END $$;

-- Verify it worked
SELECT 
  '=== NEW PROJECT ===' as check,
  id,
  name,
  company_id,
  status,
  budget,
  created_at
FROM projects
WHERE company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid
ORDER BY created_at DESC;

-- Double check the count
SELECT 
  '=== PROJECT COUNT ===' as check,
  COUNT(*) as total_projects
FROM projects
WHERE company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid;
