-- COMPREHENSIVE DIAGNOSTIC AND FIX
-- Run these queries one by one to diagnose the issue

-- 1. Check ALL schemas for notification_preferences table
SELECT 
  table_schema,
  table_name
FROM information_schema.tables 
WHERE table_name = 'notification_preferences';

-- 2. Check if it's in a different schema (like auth schema)
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE tablename = 'notification_preferences';

-- 3. List all triggers on profiles table to see what's happening
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_orientation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 4. Check for any functions that might be creating notification_preferences
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%notification_preferences%';

-- 5. SOLUTION A: If table doesn't exist in public schema, create it
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

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own notification preferences"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. SOLUTION B: If the trigger is the problem, disable all triggers temporarily
-- (Only run this if Solution A doesn't work)
/*
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgrelid = 'public.profiles'::regclass 
AND tgname NOT LIKE 'RI_%';

-- To disable a specific trigger (replace trigger_name):
-- ALTER TABLE public.profiles DISABLE TRIGGER trigger_name;

-- To disable ALL triggers temporarily (DANGEROUS - only for testing):
-- ALTER TABLE public.profiles DISABLE TRIGGER ALL;
*/
