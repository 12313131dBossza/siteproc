-- ============================================================================
-- ADD USERNAME TO PROFILES TABLE
-- Enable username/password authentication instead of magic link only
-- ============================================================================

-- Add username column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
    RAISE NOTICE '✅ Added username column to profiles table';
  ELSE
    RAISE NOTICE 'ℹ️ username column already exists';
  END IF;
END $$;

-- Add full_name column if it doesn't exist (for display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE '✅ Added full_name column to profiles table';
  ELSE
    RAISE NOTICE 'ℹ️ full_name column already exists';
  END IF;
END $$;

-- Create unique index on username (case-insensitive)
DROP INDEX IF EXISTS profiles_username_unique_idx;
CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles (LOWER(username));

COMMENT ON COLUMN public.profiles.username IS 'Unique username for login (case-insensitive)';
COMMENT ON COLUMN public.profiles.full_name IS 'User display name';

-- Verification
SELECT 
  '✅ VERIFICATION' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('username', 'full_name', 'email', 'role')
ORDER BY column_name;

-- Show indexes
SELECT 
  '✅ INDEXES' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND indexname LIKE '%username%';
