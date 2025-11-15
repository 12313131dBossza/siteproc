-- SIMPLE FIX - Run these commands ONE AT A TIME in Supabase SQL Editor

-- Step 1: Create the notification_preferences table
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

-- Step 2: Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a simple policy that allows users to manage their own preferences
CREATE POLICY "Users can manage own notification preferences"
ON public.notification_preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 4: Allow service role to insert (for the trigger)
CREATE POLICY "Service role can insert notification preferences"
ON public.notification_preferences FOR INSERT
TO service_role
WITH CHECK (true);

-- Step 5: Verify the table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;
