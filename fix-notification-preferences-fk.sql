-- Fix notification_preferences foreign key issue
-- The error happens because notification_preferences references users table
-- but new users from auth.users aren't synced to a 'users' table

-- Option 1: Check if there's a 'users' table (probably shouldn't exist - use profiles instead)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- Option 2: Check notification_preferences structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- Option 3: Check the foreign key constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'notification_preferences';

-- Option 4: Fix the constraint to reference profiles instead of users
-- ALTER TABLE notification_preferences 
-- DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
-- 
-- ALTER TABLE notification_preferences 
-- ADD CONSTRAINT notification_preferences_user_id_fkey 
-- FOREIGN KEY (user_id) 
-- REFERENCES public.profiles(id) 
-- ON DELETE CASCADE;
