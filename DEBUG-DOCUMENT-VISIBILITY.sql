-- Debug document visibility issues
-- Run this to check if documents exist and are visible

-- 1. Check total documents in the table (bypasses RLS)
SELECT 
  id,
  file_name,
  company_id,
  uploaded_by,
  created_at,
  deleted_at,
  is_latest_version
FROM documents
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check RLS policies on documents table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'documents';

-- 3. Check if the current user can see their documents
-- This simulates what the API query does
SELECT 
  d.*,
  p.full_name,
  p.email
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
WHERE d.deleted_at IS NULL
ORDER BY d.created_at DESC
LIMIT 10;

-- 4. Check for any documents uploaded in the last hour
SELECT 
  id,
  file_name,
  uploaded_by,
  created_at,
  deleted_at
FROM documents
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 5. Check company_id matches for recent uploads
SELECT 
  d.id,
  d.file_name,
  d.company_id as document_company,
  p.company_id as uploader_company,
  d.uploaded_by,
  CASE 
    WHEN d.company_id = p.company_id THEN 'MATCH ✓'
    ELSE 'MISMATCH ✗'
  END as company_match
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
WHERE d.created_at > NOW() - INTERVAL '1 hour'
ORDER BY d.created_at DESC;
