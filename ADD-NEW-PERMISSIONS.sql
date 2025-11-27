-- Add new permissions to existing project_members records
-- This updates the permissions JSONB to include new permission fields

-- Update all existing project_members to have the new permissions
-- Only add the new keys if they don't already exist
UPDATE project_members
SET permissions = 
  COALESCE(permissions, '{}'::jsonb) ||
  jsonb_build_object(
    'view_timeline', COALESCE((permissions->>'view_timeline')::boolean, true),
    'view_photos', COALESCE((permissions->>'view_photos')::boolean, true),
    'use_chat', COALESCE((permissions->>'use_chat')::boolean, true),
    'view_deliveries', COALESCE((permissions->>'view_deliveries')::boolean, false),
    'manage_deliveries', COALESCE((permissions->>'manage_deliveries')::boolean, false)
  )
WHERE permissions IS NOT NULL
  AND NOT (permissions ? 'use_chat');

-- For suppliers specifically, enable view_deliveries and manage_deliveries by default
UPDATE project_members
SET permissions = permissions || jsonb_build_object(
  'view_deliveries', true,
  'manage_deliveries', true
)
WHERE external_type = 'supplier';

-- Verify the changes
SELECT 
  id,
  external_email,
  external_name,
  external_type,
  role,
  permissions
FROM project_members
ORDER BY created_at DESC
LIMIT 10;
