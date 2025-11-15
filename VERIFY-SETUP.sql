-- Verify notification_preferences table is set up correctly

-- Check the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- Check the foreign key constraint
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'notification_preferences'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'notification_preferences';

-- Everything should show:
-- 1. Table has columns: id, user_id, email_notifications, etc.
-- 2. Foreign key: user_id → profiles(id) ✅ (not users!)
-- 3. RLS policies exist for authenticated and service_role
