-- Add metadata column to project_messages for storing order references, location data, etc.
-- Run this in Supabase SQL Editor

ALTER TABLE project_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comment
COMMENT ON COLUMN project_messages.metadata IS 'JSON metadata for special message types (order_reference, location, etc.)';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'project_messages' 
AND column_name IN ('message_type', 'metadata');
