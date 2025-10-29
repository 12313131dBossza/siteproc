-- ============================================================================
-- SUPABASE STORAGE: DOCUMENTS BUCKET CONFIGURATION
-- Run this in Supabase SQL Editor to create storage bucket
-- ============================================================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload documents to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents they uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents they uploaded" ON storage.objects;

-- Policy: Users can upload files to their company folder
CREATE POLICY "Users can upload documents to their company folder"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text 
        FROM profiles 
        WHERE id = auth.uid()
    )
);

-- Policy: Users can view files from their company folder
CREATE POLICY "Users can view documents from their company"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text 
        FROM profiles 
        WHERE id = auth.uid()
    )
);

-- Policy: Users can update files they uploaded or admins can update all
CREATE POLICY "Users can update documents they uploaded"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'documents'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND company_id::text = (storage.foldername(name))[1]
        )
    )
);

-- Policy: Users can delete files they uploaded or admins can delete all
CREATE POLICY "Users can delete documents they uploaded"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'documents'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND company_id::text = (storage.foldername(name))[1]
        )
    )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check bucket exists
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'documents';

-- Check storage policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%documents%'
ORDER BY policyname;

-- Summary
SELECT '✅ Supabase Storage: Documents Bucket Configured!' as status;
SELECT 'Bucket: documents' as component, 'Private bucket created' as status
UNION ALL
SELECT 'Policies: 4', 'Upload, view, update, delete policies'
UNION ALL
SELECT 'Structure', 'Files organized by company_id folders'
UNION ALL
SELECT 'Security', 'RLS enforced on storage.objects';

-- ============================================================================
-- STORAGE PATH STRUCTURE
-- ============================================================================

-- Documents will be stored with this path structure:
-- documents/{company_id}/{category}/{filename}
-- 
-- Example:
-- documents/123e4567-e89b-12d3-a456-426614174000/invoices/invoice-2024-001.pdf
-- documents/123e4567-e89b-12d3-a456-426614174000/photos/site-photo-20240115.jpg
--
-- This ensures:
-- 1. Company isolation (RLS policies check first folder segment)
-- 2. Category organization
-- 3. Easy cleanup when deleting a company
-- 4. Efficient querying and filtering
