-- ═══════════════════════════════════════════════════════════════
-- FIX ALL SCHEMA ISSUES - COMPREHENSIVE DATABASE FIX
-- ═══════════════════════════════════════════════════════════════
-- Purpose: Fix all critical schema issues found during testing
-- Date: October 27, 2025
-- Issues Fixed:
--   1. Missing project_id column in deliveries table
--   2. Expenses table schema issues
--   3. Order approval functionality
--   4. Supabase Storage bucket setup for POD uploads
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- PART 1: FIX DELIVERIES TABLE - Add project_id column
-- ═══════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    -- Check if project_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'deliveries' 
        AND column_name = 'project_id'
    ) THEN
        RAISE NOTICE '✅ Adding project_id column to deliveries table...';
        
        ALTER TABLE deliveries 
        ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_deliveries_project_id ON deliveries(project_id);
        
        RAISE NOTICE '✅ project_id column added successfully!';
    ELSE
        RAISE NOTICE '⚠️  project_id column already exists in deliveries table';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 2: FIX EXPENSES TABLE - Ensure all required columns exist
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Add project_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
        RAISE NOTICE '✅ Added project_id to expenses';
    END IF;

    -- Add vendor column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'vendor'
    ) THEN
        ALTER TABLE expenses ADD COLUMN vendor TEXT;
        RAISE NOTICE '✅ Added vendor to expenses';
    END IF;

    -- Add category column if missing  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'category'
    ) THEN
        ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Materials';
        RAISE NOTICE '✅ Added category to expenses';
    END IF;

    -- Add amount column if missing (should exist but check anyway)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'amount'
    ) THEN
        ALTER TABLE expenses ADD COLUMN amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ Added amount to expenses';
    END IF;

    -- Add description column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'description'
    ) THEN
        ALTER TABLE expenses ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description to expenses';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'status'
    ) THEN
        ALTER TABLE expenses ADD COLUMN status TEXT DEFAULT 'Pending';
        RAISE NOTICE '✅ Added status to expenses';
    END IF;

    -- Add company_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
        RAISE NOTICE '✅ Added company_id to expenses';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 3: FIX ORDERS TABLE - Ensure approval columns exist
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Add project_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_orders_project_id ON orders(project_id);
        RAISE NOTICE '✅ Added project_id to orders';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'status'
    ) THEN
        ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
        RAISE NOTICE '✅ Added status to orders';
    END IF;

    -- Add approved_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added approved_by to orders';
    END IF;

    -- Add approved_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added approved_at to orders';
    END IF;

    -- Add rejected_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE orders ADD COLUMN rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added rejected_by to orders';
    END IF;

    -- Add rejected_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added rejected_at to orders';
    END IF;

    -- Add rejection_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE orders ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE '✅ Added rejection_reason to orders';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 4: SETUP SUPABASE STORAGE BUCKET FOR POD UPLOADS
-- ═══════════════════════════════════════════════════════════════

-- Create delivery-proofs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for delivery-proofs bucket
-- Policy 1: Anyone authenticated can upload
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'delivery_proofs_upload'
    ) THEN
        CREATE POLICY delivery_proofs_upload ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'delivery-proofs');
        RAISE NOTICE '✅ Created upload policy for delivery-proofs bucket';
    END IF;
END $$;

-- Policy 2: Anyone can view (public bucket)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'delivery_proofs_select'
    ) THEN
        CREATE POLICY delivery_proofs_select ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'delivery-proofs');
        RAISE NOTICE '✅ Created select policy for delivery-proofs bucket';
    END IF;
END $$;

-- Policy 3: Users can delete their own uploads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'delivery_proofs_delete'
    ) THEN
        CREATE POLICY delivery_proofs_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'delivery-proofs' AND auth.uid() = owner);
        RAISE NOTICE '✅ Created delete policy for delivery-proofs bucket';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 5: VERIFY ALL FIXES
-- ═══════════════════════════════════════════════════════════════

SELECT '✅ VERIFICATION RESULTS' as section;

-- Check deliveries table
SELECT 
    'deliveries.project_id' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'deliveries' AND column_name = 'project_id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check expenses table critical columns
SELECT 
    'expenses columns' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expenses' AND column_name IN ('project_id', 'vendor', 'category', 'amount', 'description', 'status')
            GROUP BY table_name
            HAVING COUNT(*) = 6
        ) THEN '✅ ALL EXISTS'
        ELSE '❌ SOME MISSING'
    END as status;

-- Check orders approval columns
SELECT 
    'orders approval columns' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name IN ('status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason')
            GROUP BY table_name
            HAVING COUNT(*) = 6
        ) THEN '✅ ALL EXISTS'
        ELSE '❌ SOME MISSING'
    END as status;

-- Check storage bucket
SELECT 
    'delivery-proofs bucket' as bucket_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'delivery-proofs') 
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Count storage policies
SELECT 
    'storage policies count' as policy_check,
    COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE 'delivery_proofs%';

COMMIT;

SELECT '✅✅✅ ALL SCHEMA FIXES COMPLETED! ✅✅✅' as final_status;
SELECT 'Run this script in your Supabase SQL Editor' as next_step;
SELECT 'Then redeploy your app: vercel --force' as after_that;
