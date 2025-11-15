-- COMPREHENSIVE FIX FOR PROFILES TRIGGER ISSUE
-- This script will identify and disable any triggers on profiles table that are causing issues

-- STEP 1: Find all triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- STEP 2: Common trigger names to disable (run these one by one and ignore errors if trigger doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON public.profiles;
DROP TRIGGER IF EXISTS handle_new_user ON public.profiles;
DROP TRIGGER IF EXISTS create_notification_preferences ON public.profiles;
DROP TRIGGER IF EXISTS handle_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS after_profile_insert ON public.profiles;

-- STEP 3: Check if notification_preferences table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notification_preferences'
) as notification_preferences_exists;

-- STEP 4: If the table exists, check its foreign key constraints
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
WHERE tc.table_name = 'notification_preferences'
  AND tc.constraint_type = 'FOREIGN KEY';

-- STEP 5: Alternative - Create the notification_preferences table if it's supposed to exist
-- (Only run this if you want to keep the trigger functionality)
/*
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_preferences
CREATE POLICY "Users can view own notification preferences"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification preferences"
ON public.notification_preferences FOR INSERT
TO authenticated
WITH CHECK (true);
*/
