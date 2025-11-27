-- ENABLE-REALTIME-MESSAGES.sql
-- Enable Supabase Realtime on project_messages table
-- Run this in Supabase SQL Editor

-- Enable realtime for project_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE project_messages;

-- Verify it's enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

SELECT 'Realtime enabled for project_messages' AS status;
