-- Create the missing profile for your user

-- First, let's get your user ID from auth.users
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'chayaponyaibandit@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users!';
  END IF;
  
  -- Create the profile
  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    company_id,
    role,
    created_at
  )
  VALUES (
    v_user_id,
    'chayaponyaibandit@gmail.com',
    'chayapon',
    'Chayapon',
    v_company_id,
    'owner',
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    company_id = EXCLUDED.company_id,
    role = EXCLUDED.role;
  
  RAISE NOTICE '✅ Profile created/updated successfully!';
END $$;

-- Verify it worked
SELECT 
  '✅ YOUR PROFILE NOW' as status,
  id,
  email,
  username,
  full_name,
  company_id,
  role
FROM public.profiles
WHERE email = 'chayaponyaibandit@gmail.com';
