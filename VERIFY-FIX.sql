-- Let's verify EVERYTHING step by step

-- 1. Check if the company exists
SELECT '=== COMPANIES ===' as section;
SELECT * FROM public.companies ORDER BY created_at DESC;

-- 2. Check your profile
SELECT '=== YOUR PROFILE ===' as section;
SELECT 
  id,
  email,
  username,
  full_name,
  company_id,
  role,
  created_at,
  CASE 
    WHEN company_id IS NULL THEN '❌ NULL - THIS IS THE PROBLEM!'
    WHEN company_id IS NOT NULL THEN '✅ HAS COMPANY'
  END as company_status
FROM public.profiles
WHERE email = 'chayaponyaibandit@gmail.com';

-- 3. Check ALL profiles (to see if there's a duplicate)
SELECT '=== ALL PROFILES ===' as section;
SELECT 
  id,
  email,
  username,
  company_id,
  role
FROM public.profiles
ORDER BY created_at DESC;

-- 4. Check if there's a matching auth.users record
SELECT '=== AUTH USERS ===' as section;
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'chayaponyaibandit@gmail.com';
