-- 🔧 FIX: Assign Company and Create Project
-- This will fix your setup in 2 steps

-- ==========================================
-- STEP 1: Create company and assign to your profile
-- ==========================================
DO $$
DECLARE
  my_company_id UUID;
  existing_company_id UUID;
BEGIN
  -- Check if any company exists
  SELECT id INTO existing_company_id FROM companies LIMIT 1;
  
  IF existing_company_id IS NOT NULL THEN
    -- Use existing company
    my_company_id := existing_company_id;
    RAISE NOTICE '✅ Using existing company: %', my_company_id;
  ELSE
    -- Create new company
    INSERT INTO companies (name)
    VALUES ('My Company')
    RETURNING id INTO my_company_id;
    RAISE NOTICE '✅ Created new company: %', my_company_id;
  END IF;
  
  -- Assign company to your profile
  UPDATE profiles
  SET company_id = my_company_id
  WHERE id = auth.uid();
  
  RAISE NOTICE '✅ Updated your profile with company_id';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Now go to https://siteproc1.vercel.app/projects and create a project!';
  RAISE NOTICE '👉 Or scroll down to see how to create a project with SQL';
END $$;

-- Verify your profile now has a company
SELECT 
  '✅ Your Profile After Fix' as status,
  id as your_user_id,
  company_id,
  role,
  full_name
FROM profiles
WHERE id = auth.uid();

-- Show the company
SELECT 
  '✅ Your Company' as status,
  c.id as company_id,
  c.name as company_name
FROM companies c
WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- ==========================================
-- STEP 2: Create a project (MANUAL METHOD)
-- Copy your user_id and company_id from above, then uncomment and run:
-- ==========================================

-- Get your IDs (copy these values):
SELECT 
  auth.uid() as your_user_id,
  (SELECT company_id FROM profiles WHERE id = auth.uid()) as your_company_id;

-- Then uncomment and replace the IDs below:
/*
INSERT INTO projects (name, company_id, status, created_by)
VALUES (
  'My First Project',
  'PASTE_YOUR_COMPANY_ID_HERE'::uuid,
  'active',
  'PASTE_YOUR_USER_ID_HERE'::uuid
)
RETURNING id, name, status;
*/

-- ==========================================
-- ALTERNATIVE: Use Web UI (EASIER!)
-- ==========================================
-- Just go to: https://siteproc1.vercel.app/projects
-- Click "Create Project" or "New Project"
-- Fill in the project name
-- Save!
