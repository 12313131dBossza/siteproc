-- Check Available Companies and Assign Member to Company
-- Run this in Supabase SQL Editor

-- Step 1: Check existing companies
SELECT 
    'Available Companies:' as section,
    id,
    name,
    description,
    created_at
FROM public.companies
ORDER BY created_at;

-- Step 2: Check current user profiles and their company assignments
SELECT 
    'Current User-Company Assignments:' as section,
    u.email,
    p.role,
    p.full_name,
    c.name as company_name,
    p.company_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
ORDER BY c.name, p.role, u.email;
