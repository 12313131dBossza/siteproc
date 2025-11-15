-- FINAL NUCLEAR OPTION: Just drop notification_preferences entirely
-- This will remove it and all triggers/functions that reference it

DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- Now verify it's gone
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'notification_preferences';

-- Should return 0 rows
