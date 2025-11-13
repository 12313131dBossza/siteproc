-- ============================================================================
-- DIAGNOSTIC SCRIPT - Check Current Database State
-- Run this to see what's wrong
-- ============================================================================

-- Check 1: Do companies exist?
SELECT 
  '🏢 COMPANIES CHECK' as check,
  COUNT(*) as total_companies,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO COMPANIES - THIS IS THE PROBLEM!'
    ELSE '✅ Companies exist'
  END as status
FROM public.companies;

-- Check 2: Show all companies
SELECT 
  '📋 ALL COMPANIES' as check,
  id,
  name,
  created_at
FROM public.companies;

-- Check 3: Show your profile
SELECT 
  '👤 YOUR PROFILE' as check,
  id,
  email,
  username,
  full_name,
  role,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '❌ NO COMPANY - THIS IS WHY DASHBOARD FAILS!'
    ELSE '✅ Has company'
  END as company_status,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- Check 4: Count profiles without company
SELECT 
  '⚠️ PROFILES WITHOUT COMPANY' as check,
  COUNT(*) as profiles_without_company,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ SOME PROFILES MISSING COMPANY - NEEDS FIX'
    ELSE '✅ All profiles have companies'
  END as status
FROM public.profiles
WHERE company_id IS NULL;

-- Check 5: Show profiles without company
SELECT 
  '❌ BROKEN PROFILES' as check,
  id,
  email,
  role,
  company_id
FROM public.profiles
WHERE company_id IS NULL;

-- Check 6: Check if tables exist
SELECT 
  '📊 TABLES CHECK' as check,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Exists'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'profiles', 'projects', 'orders', 'deliveries', 'products')
ORDER BY table_name;

-- Check 7: Get current authenticated user
SELECT 
  '🔐 CURRENT USER' as check,
  auth.uid() as your_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED - LOGIN FIRST'
    ELSE '✅ Authenticated'
  END as auth_status;

-- Check 8: Check if your user has a profile
SELECT 
  '🔍 YOUR PROFILE LOOKUP' as check,
  p.id,
  p.email,
  p.company_id,
  c.name as company_name,
  CASE 
    WHEN p.company_id IS NULL THEN '❌ NO COMPANY'
    WHEN c.id IS NULL THEN '❌ COMPANY ID EXISTS BUT COMPANY NOT FOUND'
    ELSE '✅ PROFILE OK'
  END as status
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.id = auth.uid();
