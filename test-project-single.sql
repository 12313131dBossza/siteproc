-- Test query to verify project exists and can be retrieved
-- This mimics exactly what the API does

-- First, let's see all projects to pick a valid ID
SELECT 'ALL PROJECTS:' as info;
SELECT id, name, status, budget FROM projects ORDER BY created_at DESC LIMIT 5;

-- Test .single() behavior - this should work for any existing project
-- Replace 'your-project-id-here' with an actual project ID from above
-- SELECT * FROM projects WHERE id = 'your-project-id-here';
