-- Fix supplier roles for existing users who were invited as suppliers
-- This updates profiles.role to match their project_members.external_type

-- First, let's see who needs to be fixed
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role as current_role,
    pm.external_type,
    pm.status,
    proj.name as project_name
FROM profiles p
JOIN project_members pm ON pm.user_id = p.id
JOIN projects proj ON proj.id = pm.project_id
WHERE pm.external_type IN ('supplier', 'client', 'contractor')
  AND p.role NOT IN ('supplier', 'client', 'contractor')
  AND pm.status = 'active';

-- Update profiles to match their external_type from project_members
UPDATE profiles p
SET role = pm.external_type
FROM project_members pm
WHERE pm.user_id = p.id
  AND pm.external_type IN ('supplier', 'client', 'contractor')
  AND p.role NOT IN ('supplier', 'client', 'contractor', 'admin', 'owner', 'manager')
  AND pm.status = 'active';

-- Verify the fix
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role as updated_role,
    pm.external_type
FROM profiles p
JOIN project_members pm ON pm.user_id = p.id
WHERE pm.external_type IN ('supplier', 'client', 'contractor')
  AND pm.status = 'active';
