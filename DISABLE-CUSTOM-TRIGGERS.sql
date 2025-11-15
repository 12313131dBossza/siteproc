-- DISABLE ONLY CUSTOM TRIGGERS (not system triggers)

-- First, see what custom triggers exist
SELECT tgname
FROM pg_trigger 
WHERE tgrelid = 'public.profiles'::regclass 
AND tgname NOT LIKE 'RI_%';

-- Disable each custom trigger (replace 'trigger_name' with actual name from above query)
-- Example:
-- ALTER TABLE public.profiles DISABLE TRIGGER handle_new_user;
-- ALTER TABLE public.profiles DISABLE TRIGGER on_auth_user_created;
