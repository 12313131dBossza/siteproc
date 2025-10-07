-- ============================================================================
-- SUPABASE STORAGE SETUP FOR POD UPLOADS
-- ============================================================================
-- Run this in Supabase SQL Editor to create storage bucket and RLS policies
-- ============================================================================

-- Step 1: Create storage bucket for delivery proofs
-- Note: This must be run as a Supabase admin
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create RLS policy to allow authenticated users to upload (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload delivery proofs'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload delivery proofs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'delivery-proofs');
    RAISE NOTICE '✅ Created upload policy';
  ELSE
    RAISE NOTICE '⏭️  Upload policy already exists';
  END IF;
END $$;

-- Step 3: Create RLS policy to allow authenticated users to update their uploads (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to update their delivery proofs'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their delivery proofs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'delivery-proofs');
    RAISE NOTICE '✅ Created update policy';
  ELSE
    RAISE NOTICE '⏭️  Update policy already exists';
  END IF;
END $$;

-- Step 4: Create RLS policy to allow authenticated users to delete their uploads (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to delete their delivery proofs'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete their delivery proofs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'delivery-proofs');
    RAISE NOTICE '✅ Created delete policy';
  ELSE
    RAISE NOTICE '⏭️  Delete policy already exists';
  END IF;
END $$;

-- Step 5: Create RLS policy to allow public read access (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public read access to delivery proofs'
  ) THEN
    CREATE POLICY "Allow public read access to delivery proofs"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'delivery-proofs');
    RAISE NOTICE '✅ Created public read policy';
  ELSE
    RAISE NOTICE '⏭️  Public read policy already exists';
  END IF;
END $$;

-- Verification
SELECT 
    '✅ Storage bucket and policies created successfully!' as status;

-- Show created bucket
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'delivery-proofs';
