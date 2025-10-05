-- 🔍 COMPREHENSIVE PROJECTS DIAGNOSIS
-- Run this in Supabase SQL Editor while logged into your app

-- 1. Check your user and profile
SELECT 
  '=== YOUR USER INFO ===' as section,
  auth.uid() as your_user_id;

SELECT 
  '=== YOUR PROFILE ===' as section,
  id,
  company_id,
  role,
  full_name
FROM profiles
WHERE id = auth.uid();

-- 2. Check if you have a company
SELECT 
  '=== YOUR COMPANY ===' as section,
  c.id as company_id,
  c.name as company_name
FROM companies c
JOIN profiles p ON p.company_id = c.id
WHERE p.id = auth.uid();

-- 3. Check ALL projects in database
SELECT 
  '=== ALL PROJECTS IN DATABASE ===' as section,
  id,
  name,
  company_id,
  status,
  created_by,
  created_at
FROM projects
ORDER BY created_at DESC;

-- 4. Check projects for YOUR company
SELECT 
  '=== YOUR COMPANY PROJECTS ===' as section,
  p.id as project_id,
  p.name as project_name,
  p.company_id,
  p.status,
  p.created_at
FROM projects p
WHERE p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid());

-- 5. Check RLS policies on projects table
SELECT 
  '=== PROJECTS TABLE RLS POLICIES ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects';

-- 6. Test if you can read from projects at all
SELECT 
  '=== CAN YOU READ PROJECTS? ===' as section,
  COUNT(*) as total_projects_you_can_see
FROM projects;
