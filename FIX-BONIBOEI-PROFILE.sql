-- FIX-BONIBOEI-PROFILE.sql
-- Fix the profile role for boniboei@gmail.com
-- The user was incorrectly set to 'supplier' when accepting a project invitation

-- First, check current state
SELECT id, email, full_name, role, company_id, username
FROM profiles 
WHERE email = 'boniboei@gmail.com';

-- Fix the role to 'member' (or 'viewer' if they shouldn't have full access)
UPDATE profiles 
SET role = 'member', updated_at = NOW()
WHERE email = 'boniboei@gmail.com';

-- Verify the fix
SELECT id, email, full_name, role, company_id, username
FROM profiles 
WHERE email = 'boniboei@gmail.com';
