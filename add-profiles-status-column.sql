-- Add missing status column to profiles table
-- Run this in Supabase SQL Editor

-- Add status column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update any existing profiles to have 'active' status
UPDATE public.profiles 
SET status = 'active' 
WHERE status IS NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'status';
