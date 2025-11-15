-- COMPLETE FIX FOR NOTIFICATION_PREFERENCES TRIGGER ISSUE
-- Run these commands in order in your Supabase SQL Editor

-- STEP 1: Check if notification_preferences table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notification_preferences';

-- STEP 2: If table exists, check its foreign key constraint
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

-- STEP 3: Fix the foreign key to reference profiles instead of users
-- First, drop the incorrect foreign key constraint
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

-- Then, add the correct foreign key constraint pointing to profiles
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT notification_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- STEP 4: Verify the fix
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

-- You should now see that user_id references profiles(id) instead of users
