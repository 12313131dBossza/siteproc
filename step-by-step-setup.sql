-- 🚀 FINAL SOLUTION: Create Everything Step by Step
-- This creates company, project, and order in separate steps

-- ===========================================
-- STEP 1: Create or get company
-- ===========================================
DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
BEGIN
  my_user_id := auth.uid();
  
  -- Check if profile has company
  SELECT company_id INTO my_company_id FROM profiles WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    -- Check if any company exists
    SELECT id INTO my_company_id FROM companies LIMIT 1;
    
    IF my_company_id IS NULL THEN
      -- Create a new company
      INSERT INTO companies (name)
      VALUES ('My Test Company - ' || to_char(NOW(), 'YYYY-MM-DD'))
      RETURNING id INTO my_company_id;
      
      RAISE NOTICE '✅ Created new company: %', my_company_id;
    ELSE
      RAISE NOTICE '✅ Found existing company: %', my_company_id;
    END IF;
    
    -- Update profile with company
    UPDATE profiles 
    SET company_id = my_company_id
    WHERE id = my_user_id;
    
    RAISE NOTICE '✅ Updated your profile with company_id';
  ELSE
    RAISE NOTICE '✅ You already have a company: %', my_company_id;
  END IF;
END $$;

-- Show current status
SELECT 
  '✅ After Step 1' as status,
  id as user_id,
  company_id,
  role
FROM profiles
WHERE id = auth.uid();

-- ===========================================
-- STEP 2: Create project (MANUAL - Copy the values from above)
-- ===========================================
-- ⚠️ IMPORTANT: Replace YOUR_COMPANY_ID and YOUR_USER_ID below with actual values from the query above

-- INSERT INTO projects (name, company_id, status, created_by)
-- VALUES (
--   'Test Project - ' || to_char(NOW(), 'YYYY-MM-DD'),
--   'YOUR_COMPANY_ID'::uuid,  -- Replace with your company_id from above
--   'active',
--   'YOUR_USER_ID'::uuid      -- Replace with your user_id from above
-- )
-- RETURNING id, name;

-- ===========================================
-- STEP 3: Create order (MANUAL - Copy the project_id from Step 2)
-- ===========================================
-- After running Step 2, uncomment and replace YOUR_PROJECT_ID:

-- INSERT INTO purchase_orders (
--   project_id,
--   amount,
--   description,
--   category,
--   status,
--   requested_by,
--   requested_at
-- ) VALUES (
--   'YOUR_PROJECT_ID'::uuid,  -- Replace with project id from Step 2
--   2500.00,
--   'Test Order - Created ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
--   'Equipment',
--   'pending',
--   auth.uid(),
--   NOW()
-- )
-- RETURNING id, amount, description, status;

-- ===========================================
-- VERIFY: Check everything
-- ===========================================
SELECT '=== YOUR DATA ===' as section;

SELECT 'Company' as type, * FROM companies WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid());
SELECT 'Projects' as type, id, name, status FROM projects WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());
SELECT 'Orders' as type, id, amount, description, status FROM purchase_orders WHERE requested_by = auth.uid() ORDER BY created_at DESC LIMIT 5;
