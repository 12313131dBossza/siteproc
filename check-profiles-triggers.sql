-- Check what triggers exist on profiles table that might be causing issues

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- If there's a trigger creating notification_preferences, we can disable it:
-- DROP TRIGGER IF EXISTS trigger_name ON public.profiles;
