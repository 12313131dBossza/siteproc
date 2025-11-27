-- COMPREHENSIVE-MESSAGING-CHECK.sql
-- Complete check for messaging system setup
-- Run this in Supabase SQL Editor

-- 1. Check if project_messages table exists and has correct columns
SELECT 'project_messages table check:';
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'project_messages'
ORDER BY ordinal_position;

-- 2. Check all profiles with their roles
SELECT '-- All profiles with roles:';
SELECT id, email, full_name, role, company_id, status
FROM profiles
ORDER BY role, email;

-- 3. Check project_members with external_type (suppliers/clients)
SELECT '-- Project members with external_type:';
SELECT 
  pm.id,
  pm.user_id,
  pm.project_id,
  pm.external_type,
  pm.external_email,
  pm.status,
  p.name AS project_name,
  pr.email,
  pr.full_name,
  pr.role AS profile_role
FROM project_members pm
LEFT JOIN projects p ON pm.project_id = p.id
LEFT JOIN profiles pr ON pm.user_id = pr.id
WHERE pm.external_type IS NOT NULL
ORDER BY pm.external_type, p.name;

-- 4. Check existing messages
SELECT '-- Recent messages:';
SELECT 
  m.id,
  m.project_id,
  p.name AS project_name,
  m.channel,
  m.sender_id,
  pr.email AS sender_email,
  m.sender_type,
  LEFT(m.message, 50) AS message_preview,
  m.created_at
FROM project_messages m
JOIN projects p ON m.project_id = p.id
LEFT JOIN profiles pr ON m.sender_id = pr.id
ORDER BY m.created_at DESC
LIMIT 20;

-- 5. Role mismatch check - profiles where role doesn't match their project_member external_type
SELECT '-- Role mismatches (profiles that should be updated):';
SELECT 
  pr.id,
  pr.email,
  pr.role AS current_profile_role,
  pm.external_type AS member_external_type,
  p.name AS project_name,
  'Profile role should be: ' || pm.external_type AS fix_needed
FROM project_members pm
JOIN profiles pr ON pm.user_id = pr.id
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id IS NOT NULL
  AND pm.status = 'active'
  AND pm.external_type IS NOT NULL
  AND (
    (pm.external_type = 'supplier' AND pr.role != 'supplier')
    OR (pm.external_type = 'client' AND pr.role NOT IN ('client', 'viewer'))
  );

-- 6. Count summary
SELECT '-- Summary:';
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'supplier') AS supplier_profiles,
  (SELECT COUNT(*) FROM profiles WHERE role = 'client') AS client_profiles,
  (SELECT COUNT(*) FROM project_members WHERE external_type = 'supplier' AND user_id IS NOT NULL AND status = 'active') AS active_supplier_members,
  (SELECT COUNT(*) FROM project_members WHERE external_type = 'client' AND user_id IS NOT NULL AND status = 'active') AS active_client_members,
  (SELECT COUNT(*) FROM project_messages) AS total_messages;

SELECT 'Check complete' AS status;
