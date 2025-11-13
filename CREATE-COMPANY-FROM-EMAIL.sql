-- ============================================================================
-- CREATE COMPANY WITH EMAIL-BASED NAME
-- Use this to create a company for your email automatically
-- ============================================================================

-- Option 1: Create company using your email domain
-- Example: admin@acmecorp.com → Company name: "Acmecorp"

DO $$
DECLARE
  user_email TEXT;
  company_name TEXT;
  v_company_id UUID;  -- Renamed to avoid conflict
  user_id UUID;
BEGIN
  -- CHANGE THIS TO YOUR EMAIL
  user_email := 'chayaponyaibandit@gmail.com';  -- ← REPLACE WITH YOUR ACTUAL EMAIL
  
  -- Get user ID from auth.users table
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please login first!', user_email;
  END IF;
  
  -- Extract company name from email domain
  -- Example: admin@acmecorp.com → "Acmecorp"
  company_name := INITCAP(split_part(split_part(user_email, '@', 2), '.', 1));
  
  -- Check if company already exists
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE LOWER(name) = LOWER(company_name);
  
  -- Create company if it doesn't exist
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, created_at)
    VALUES (company_name, now())
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ Created company: % (ID: %)', company_name, v_company_id;
  ELSE
    RAISE NOTICE 'ℹ️ Company already exists: % (ID: %)', company_name, v_company_id;
  END IF;
  
  -- Update user profile with company
  UPDATE public.profiles p
  SET 
    company_id = v_company_id,  -- Use the variable
    role = COALESCE(p.role, 'owner'),  -- Make them owner of the company
    username = COALESCE(p.username, LOWER(REPLACE(split_part(user_email, '@', 1), '.', '_'))),
    full_name = COALESCE(p.full_name, split_part(user_email, '@', 1))
  WHERE p.id = user_id;
  
  RAISE NOTICE '✅ Updated profile for user: %', user_email;
  RAISE NOTICE '✅ SETUP COMPLETE!';
  
END $$;

-- Verify the setup
SELECT 
  '✅ YOUR PROFILE' as check,
  p.email,
  p.username,
  p.full_name,
  p.role,
  c.name as company_name,
  p.company_id
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.email = 'chayaponyaibandit@gmail.com';  -- ← REPLACE WITH YOUR ACTUAL EMAIL
