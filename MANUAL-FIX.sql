-- ============================================================================
-- MANUAL FIX - Force assign company to ALL profiles
-- Run this if COMPLETE-DATABASE-SETUP.sql didn't work
-- ============================================================================

-- Step 1: Create the default company (force insert)
DELETE FROM public.companies WHERE id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid;

INSERT INTO public.companies (id, name, created_at)
VALUES ('1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid, 'Default Company', now());

-- Step 2: Force update ALL profiles to have this company
UPDATE public.profiles 
SET 
  company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid,
  role = COALESCE(role, 'admin'),
  username = COALESCE(username, LOWER(REPLACE(split_part(email, '@', 1), '.', '_'))),
  full_name = COALESCE(full_name, split_part(email, '@', 1))
WHERE TRUE;  -- Update ALL profiles without condition

-- Step 3: Verify the fix
SELECT 
  '✅ VERIFICATION' as check,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as profiles_with_company,
  COUNT(*) FILTER (WHERE company_id IS NULL) as profiles_without_company
FROM public.profiles;

-- Step 4: Show all profiles
SELECT 
  email,
  username,
  company_id,
  role,
  CASE 
    WHEN company_id IS NULL THEN '❌ STILL BROKEN'
    ELSE '✅ FIXED'
  END as status
FROM public.profiles;

-- Step 5: Show companies
SELECT 
  '✅ COMPANIES' as check,
  id,
  name
FROM public.companies;

SELECT '✅ MANUAL FIX COMPLETE - Try logging in again!' as message;
