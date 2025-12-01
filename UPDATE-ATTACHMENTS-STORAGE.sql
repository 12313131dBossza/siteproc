-- UPDATE-ATTACHMENTS-STORAGE.sql
-- Updates the storage bucket to support audio files for voice messages
-- Run this in Supabase SQL Editor

-- Update the attachments bucket to include audio types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    -- Audio types for voice messages
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/mp4',
    'audio/aac'
  ],
  file_size_limit = 10485760  -- 10MB
WHERE id = 'attachments';

-- If the bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/mp4',
    'audio/aac'
  ]
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Attachments storage updated with audio support!' AS status;
