-- FIX-SUPPLIER-PROFILES.sql
-- Updates profiles.role for users who are suppliers in project_members
-- Run this in Supabase SQL Editor

-- First, let's see what we have
SELECT 
  pm.id,
  pm.user_id,
  pm.project_id,
  pm.external_type,
  pm.status,
  p.email,
  p.full_name,
  p.role AS current_role
FROM project_members pm
JOIN profiles p ON pm.user_id = p.id
WHERE pm.external_type = 'supplier'
  AND pm.user_id IS NOT NULL
  AND pm.status = 'active';

-- Update profiles.role to 'supplier' for users who are suppliers in project_members
UPDATE profiles
SET role = 'supplier'
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM project_members 
  WHERE external_type = 'supplier' 
    AND user_id IS NOT NULL
    AND status = 'active'
)
AND role NOT IN ('admin', 'owner'); -- Don't demote admins/owners

-- Verify the changes
SELECT 
  pm.id,
  pm.user_id,
  pm.project_id,
  pm.external_type,
  pm.status,
  p.email,
  p.full_name,
  p.role AS updated_role
FROM project_members pm
JOIN profiles p ON pm.user_id = p.id
WHERE pm.external_type = 'supplier'
  AND pm.user_id IS NOT NULL
  AND pm.status = 'active';

-- Also update profiles.role to 'client' for users who are clients in project_members
UPDATE profiles
SET role = 'client'
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM project_members 
  WHERE external_type = 'client' 
    AND user_id IS NOT NULL
    AND status = 'active'
)
AND role NOT IN ('admin', 'owner', 'supplier'); -- Don't change admins, owners, or suppliers

SELECT 'Profile roles updated based on project_members external_type' AS status;
