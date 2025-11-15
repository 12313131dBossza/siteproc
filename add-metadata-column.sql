-- Add metadata column to existing user_invitations table
-- Run this in Supabase SQL Editor

-- Add the metadata column if it doesn't exist
ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_invitations'
ORDER BY ordinal_position;
