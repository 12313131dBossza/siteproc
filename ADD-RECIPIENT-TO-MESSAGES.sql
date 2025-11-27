-- ADD-RECIPIENT-TO-MESSAGES.sql
-- Adds recipient_id field to project_messages for 1:1 conversations
-- Run this in Supabase SQL Editor

-- Add recipient_id column (nullable for broadcast/group messages)
ALTER TABLE public.project_messages
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookup by recipient
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.project_messages(recipient_id);

-- Add composite index for filtering by project + recipient
CREATE INDEX IF NOT EXISTS idx_messages_project_recipient ON public.project_messages(project_id, recipient_id);

-- Done!
SELECT 'recipient_id column added to project_messages' AS status;
