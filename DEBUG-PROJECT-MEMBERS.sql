-- DEBUG-PROJECT-MEMBERS.sql
-- Check the current state of project_members to understand the data

-- 1. Show ALL project_members (both pending and active)
SELECT 
  pm.id,
  pm.project_id,
  p.name AS project_name,
  pm.user_id,
  pm.external_email,
  pm.external_name,
  pm.external_type,
  pm.status,
  pm.role,
  pr.full_name AS profile_name,
  pr.email AS profile_email
FROM project_members pm
LEFT JOIN projects p ON pm.project_id = p.id
LEFT JOIN profiles pr ON pm.user_id = pr.id
WHERE pm.external_type IN ('supplier', 'client')
ORDER BY p.name, pm.external_type;

-- 2. Count by status
SELECT 
  external_type,
  status,
  COUNT(*) as count,
  COUNT(user_id) as with_user_id,
  COUNT(external_email) as with_external_email
FROM project_members
WHERE external_type IN ('supplier', 'client')
GROUP BY external_type, status;

-- 3. Check if there are any active supplier/client members
SELECT 
  pm.id,
  pm.project_id,
  p.name AS project_name,
  pm.user_id,
  COALESCE(pr.full_name, pm.external_name, pm.external_email) AS display_name,
  pm.external_type,
  pm.status
FROM project_members pm
LEFT JOIN projects p ON pm.project_id = p.id
LEFT JOIN profiles pr ON pm.user_id = pr.id
WHERE pm.external_type IN ('supplier', 'client')
  AND pm.status = 'active'
ORDER BY p.name;

SELECT 'Debug complete' AS status;
