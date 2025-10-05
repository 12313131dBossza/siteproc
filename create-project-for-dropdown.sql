-- ✅ CREATE A PROJECT SO THE DROPDOWN WORKS
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  new_project_id UUID;
BEGIN
  my_user_id := auth.uid();
  
  -- Get company
  SELECT company_id INTO my_company_id FROM profiles WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    RAISE EXCEPTION 'You need to run all-in-one-fix.sql first to assign a company!';
  END IF;
  
  -- Create a project
  INSERT INTO projects (
    name,
    company_id,
    status,
    created_by,
    budget,
    created_at
  ) VALUES (
    'My First Project',
    my_company_id,
    'active',
    my_user_id,
    10000.00,
    NOW()
  )
  RETURNING id INTO new_project_id;
  
  RAISE NOTICE '✅ Created project: %', new_project_id;
  RAISE NOTICE '👉 Now go back to: https://siteproc1.vercel.app/orders/new';
  RAISE NOTICE '👉 Refresh the page (F5)';
  RAISE NOTICE '👉 The project dropdown should now show "My First Project"!';
END $$;

-- Verify
SELECT 
  'Your Projects' as info,
  id,
  name,
  status,
  budget
FROM projects
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());
