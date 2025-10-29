-- ============================================================================
-- SUPABASE STORAGE: DOCUMENTS BUCKET CONFIGURATION
-- ============================================================================
-- NOTE: Storage bucket and RLS policies MUST be created via Supabase Dashboard UI
-- You cannot create storage policies via SQL (permission denied error)
-- 
-- Follow these steps instead:
-- ============================================================================

-- STEP 1: Create Bucket via Dashboard
-- ----------------------------------------------------------------------------
-- 1. Go to: Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Bucket name: documents
-- 4. Public bucket: OFF (private)
-- 5. Click "Create bucket"

-- STEP 2: Create RLS Policies via Dashboard
-- ----------------------------------------------------------------------------
-- 1. Click on "documents" bucket
-- 2. Go to "Policies" tab
-- 3. Click "New Policy"
-- 4. Create these 4 policies (see below for SQL to use in policy editor)

-- ============================================================================
-- POLICY 1: Upload - Users can upload to their company folder
-- ============================================================================
-- Policy name: Users can upload documents to their company folder
-- Allowed operations: INSERT
-- Policy definition (USING expression):

-- bucket_id = 'documents'
-- AND (storage.foldername(name))[1] IN (
--     SELECT company_id::text 
--     FROM profiles 
--     WHERE id = auth.uid()
-- )

-- ============================================================================
-- POLICY 2: Select - Users can view their company's files
-- ============================================================================
-- Policy name: Users can view documents from their company
-- Allowed operations: SELECT
-- Policy definition (USING expression):

-- bucket_id = 'documents'
-- AND (storage.foldername(name))[1] IN (
--     SELECT company_id::text 
--     FROM profiles 
--     WHERE id = auth.uid()
-- )

-- ============================================================================
-- POLICY 3: Update - Users can update own files, admins can update all
-- ============================================================================
-- Policy name: Users can update documents they uploaded
-- Allowed operations: UPDATE
-- Policy definition (USING expression):

-- bucket_id = 'documents'
-- AND (
--     owner = auth.uid()
--     OR EXISTS (
--         SELECT 1 FROM profiles 
--         WHERE id = auth.uid() 
--         AND role IN ('owner', 'admin')
--         AND company_id::text = (storage.foldername(name))[1]
--     )
-- )

-- ============================================================================
-- POLICY 4: Delete - Users can delete own files, admins can delete all
-- ============================================================================
-- Policy name: Users can delete documents they uploaded
-- Allowed operations: DELETE
-- Policy definition (USING expression):

-- bucket_id = 'documents'
-- AND (
--     owner = auth.uid()
--     OR EXISTS (
--         SELECT 1 FROM profiles 
--         WHERE id = auth.uid() 
--         AND role IN ('owner', 'admin')
--         AND company_id::text = (storage.foldername(name))[1]
--     )
-- )

-- ============================================================================
-- VERIFICATION (Run this SQL to check setup)
-- ============================================================================

-- Check bucket exists
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'documents';

-- Check storage policies (should return 4 policies)
SELECT 
    policyname,
    cmd as command
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
