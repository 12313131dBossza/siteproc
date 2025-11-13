-- Direct fix - no fancy logic, just fix it NOW

-- Step 1: Create a company (using a simple name)
INSERT INTO public.companies (id, name, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'My Company',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update YOUR profile directly
UPDATE public.profiles
SET 
  company_id = '11111111-1111-1111-1111-111111111111'::uuid,
  role = 'owner',
  username = 'chayapon',
  full_name = 'Chayapon'
WHERE email = 'chayaponyaibandit@gmail.com';

-- Step 3: Verify it worked
SELECT 
  email,
  username,
  full_name,
  role,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '❌ STILL NULL - NOT FIXED'
    ELSE '✅ FIXED!'
  END as status
FROM public.profiles
WHERE email = 'chayaponyaibandit@gmail.com';
