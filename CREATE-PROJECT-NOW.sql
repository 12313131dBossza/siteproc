-- 🚀 INSTANT FIX: Create a project so the dropdown works
-- Run this RIGHT NOW in Supabase SQL Editor

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  new_project_id UUID;
BEGIN
  my_user_id := auth.uid();
  
  -- Get your company_id
  SELECT company_id INTO my_company_id 
  FROM profiles 
  WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No company assigned. Run all-in-one-fix.sql first!';
  END IF;
  
  -- Create a project
  INSERT INTO projects (
    name,
    company_id,
    status,
    created_by,
    budget,
    created_at,
    updated_at
  ) VALUES (
    'Main Project',
    my_company_id,
    'active',
    my_user_id,
    100000.00,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_project_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SUCCESS! Created project: %', new_project_id;
  RAISE NOTICE '';
  RAISE NOTICE '👉 NOW: Go back to https://siteproc1.vercel.app/orders/new';
  RAISE NOTICE '👉 Press F5 to refresh the page';
  RAISE NOTICE '👉 The project dropdown will now show "Main Project"!';
  RAISE NOTICE '';
END $$;

-- Verify the project was created
SELECT 
  '✅ Your Project Created Successfully!' as message,
  id,
  name,
  status,
  budget,
  created_at
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());
