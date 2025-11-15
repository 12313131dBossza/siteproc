-- FIX THE FOREIGN KEY - Run this in Supabase SQL Editor

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT notification_preferences_user_id_fkey;

-- Step 2: Add the correct foreign key pointing to profiles
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT notification_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 3: Verify the fix worked
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

-- The result should show: user_id → profiles (not users!)
