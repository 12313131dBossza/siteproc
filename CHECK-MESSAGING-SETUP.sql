-- CHECK-MESSAGING-SETUP.sql
-- Run this to verify messaging is properly set up

-- 1. Check if project_messages table exists
SELECT 'project_messages table exists: ' || EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'project_messages'
)::text AS check_result;

-- 2. Check if supplier_assignments table exists
SELECT 'supplier_assignments table exists: ' || EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'supplier_assignments'
)::text AS check_result;

-- 3. Show project_messages columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_messages'
ORDER BY ordinal_position;

-- 4. Check if helper functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_supplier_for_project', 'is_client_for_project', 'is_company_member');

-- 5. Check RLS policies on project_messages
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'project_messages';

-- 6. Test: See all projects in your company
SELECT id, name, code FROM projects LIMIT 10;

-- 7. Test: Try to see if you can query project_messages (will be empty if no messages yet)
SELECT COUNT(*) as message_count FROM project_messages;
