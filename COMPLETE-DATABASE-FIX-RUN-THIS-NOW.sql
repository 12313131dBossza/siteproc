-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE DATABASE FIX - RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════════════════════════════
-- This fixes ALL remaining issues:
-- 1. Adds project_id to deliveries table
-- 2. Fixes expenses table schema
-- 3. Creates storage bucket for file uploads
-- 4. Refreshes schema cache
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ========================================================================
-- 1. FIX DELIVERIES TABLE - Add project_id column
-- ========================================================================

DO $$
BEGIN
    -- Add project_id column to deliveries if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        CREATE INDEX idx_deliveries_project_id ON deliveries(project_id);
        RAISE NOTICE '✅ Added project_id to deliveries table';
    ELSE
        RAISE NOTICE '✓ project_id already exists in deliveries';
    END IF;

    -- Add order_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;
        CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
        RAISE NOTICE '✅ Added order_id to deliveries table';
    ELSE
        RAISE NOTICE '✓ order_id already exists in deliveries';
    END IF;

    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        CREATE INDEX idx_deliveries_company_id ON deliveries(company_id);
        RAISE NOTICE '✅ Added company_id to deliveries table';
    ELSE
        RAISE NOTICE '✓ company_id already exists in deliveries';
    END IF;

    -- Add proof_urls column if it doesn't exist (for POD images/PDFs)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'proof_urls'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN proof_urls JSONB;
        RAISE NOTICE '✅ Added proof_urls to deliveries table';
    ELSE
        RAISE NOTICE '✓ proof_urls already exists in deliveries';
    END IF;
END $$;

-- ========================================================================
-- 2. FIX EXPENSES TABLE - Ensure all required columns exist
-- ========================================================================

DO $$
BEGIN
    -- Add project_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        CREATE INDEX idx_expenses_project_id ON expenses(project_id);
        RAISE NOTICE '✅ Added project_id to expenses table';
    ELSE
        RAISE NOTICE '✓ project_id already exists in expenses';
    END IF;

    -- Add company_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        CREATE INDEX idx_expenses_company_id ON expenses(company_id);
        RAISE NOTICE '✅ Added company_id to expenses table';
    ELSE
        RAISE NOTICE '✓ company_id already exists in expenses';
    END IF;

    -- Add vendor column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'vendor'
    ) THEN
        ALTER TABLE expenses ADD COLUMN vendor TEXT;
        RAISE NOTICE '✅ Added vendor to expenses table';
    ELSE
        RAISE NOTICE '✓ vendor already exists in expenses';
    END IF;

    -- Add category column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'category'
    ) THEN
        ALTER TABLE expenses ADD COLUMN category TEXT;
        RAISE NOTICE '✅ Added category to expenses table';
    ELSE
        RAISE NOTICE '✓ category already exists in expenses';
    END IF;

    -- Add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'status'
    ) THEN
        ALTER TABLE expenses ADD COLUMN status TEXT DEFAULT 'pending';
        RAISE NOTICE '✅ Added status to expenses table';
    ELSE
        RAISE NOTICE '✓ status already exists in expenses';
    END IF;
END $$;

-- ========================================================================
-- 3. CREATE STORAGE BUCKET FOR FILE UPLOADS
-- ========================================================================

-- Create delivery-proofs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for delivery-proofs bucket (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- Only create policies if they don't already exist
DO $$
BEGIN
    -- Create upload policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads'
    ) THEN
        CREATE POLICY "Allow authenticated uploads"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'delivery-proofs');
    END IF;

    -- Create read policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'delivery-proofs');
    END IF;

    -- Create delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow authenticated delete'
    ) THEN
        CREATE POLICY "Allow authenticated delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'delivery-proofs');
    END IF;
END $$;

-- ========================================================================
-- 4. BACKFILL MISSING COMPANY IDs (Critical for RLS)
-- ========================================================================

-- Backfill deliveries company_id from projects
UPDATE deliveries d
SET company_id = p.company_id
FROM projects p
WHERE d.project_id = p.id
AND d.company_id IS NULL;

-- Backfill expenses company_id from projects
UPDATE expenses e
SET company_id = p.company_id
FROM projects p
WHERE e.project_id = p.id
AND e.company_id IS NULL;

-- Backfill purchase_orders company_id from projects
UPDATE purchase_orders po
SET company_id = p.company_id
FROM projects p
WHERE po.project_id = p.id
AND po.company_id IS NULL;

-- ========================================================================
-- 5. ENSURE RLS POLICIES ARE CORRECT
-- ========================================================================

-- Deliveries RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deliveries_select_policy ON deliveries;
DROP POLICY IF EXISTS deliveries_insert_policy ON deliveries;
DROP POLICY IF EXISTS deliveries_update_policy ON deliveries;
DROP POLICY IF EXISTS deliveries_delete_policy ON deliveries;

CREATE POLICY deliveries_select_policy ON deliveries
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY deliveries_insert_policy ON deliveries
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY deliveries_update_policy ON deliveries
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY deliveries_delete_policy ON deliveries
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Expenses RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_select_policy ON expenses;
DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
DROP POLICY IF EXISTS expenses_update_policy ON expenses;
DROP POLICY IF EXISTS expenses_delete_policy ON expenses;

CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY expenses_delete_policy ON expenses
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

COMMIT;

-- ========================================================================
-- 6. REFRESH SCHEMA CACHE (CRITICAL!)
-- ========================================================================
NOTIFY pgrst, 'reload schema';

-- ========================================================================
-- 7. VERIFICATION
-- ========================================================================

SELECT '════════════════════════════════════════════════' as separator;
SELECT '✅✅✅ DATABASE FIX COMPLETE! ✅✅✅' as status;
SELECT '════════════════════════════════════════════════' as separator;

-- Check deliveries columns
SELECT 
    '📋 DELIVERIES TABLE' as check_type,
    COUNT(*) FILTER (WHERE column_name = 'project_id') as has_project_id,
    COUNT(*) FILTER (WHERE column_name = 'order_id') as has_order_id,
    COUNT(*) FILTER (WHERE column_name = 'company_id') as has_company_id,
    COUNT(*) FILTER (WHERE column_name = 'proof_urls') as has_proof_urls,
    CASE 
        WHEN COUNT(*) FILTER (WHERE column_name IN ('project_id', 'order_id', 'company_id', 'proof_urls')) = 4
        THEN '✅ ALL COLUMNS PRESENT'
        ELSE '❌ MISSING COLUMNS'
    END as status
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
AND column_name IN ('project_id', 'order_id', 'company_id', 'proof_urls');

-- Check expenses columns
SELECT 
    '💰 EXPENSES TABLE' as check_type,
    COUNT(*) FILTER (WHERE column_name = 'project_id') as has_project_id,
    COUNT(*) FILTER (WHERE column_name = 'company_id') as has_company_id,
    COUNT(*) FILTER (WHERE column_name = 'vendor') as has_vendor,
    COUNT(*) FILTER (WHERE column_name = 'category') as has_category,
    COUNT(*) FILTER (WHERE column_name = 'status') as has_status,
    CASE 
        WHEN COUNT(*) FILTER (WHERE column_name IN ('project_id', 'company_id', 'vendor', 'category', 'status')) = 5 
        THEN '✅ ALL COLUMNS PRESENT'
        ELSE '❌ MISSING COLUMNS'
    END as status
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('project_id', 'company_id', 'vendor', 'category', 'status');

-- Check storage bucket
SELECT 
    '📁 STORAGE BUCKET' as check_type,
    COUNT(*) as bucket_exists,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ BUCKET EXISTS'
        ELSE '❌ BUCKET MISSING'
    END as status
FROM storage.buckets 
WHERE id = 'delivery-proofs';

-- Check for NULL company_ids (should be 0)
SELECT 
    '🔍 NULL COMPANY IDS CHECK' as check_type,
    (SELECT COUNT(*) FROM deliveries WHERE company_id IS NULL) as deliveries_null,
    (SELECT COUNT(*) FROM expenses WHERE company_id IS NULL) as expenses_null,
    (SELECT COUNT(*) FROM purchase_orders WHERE company_id IS NULL) as orders_null,
    CASE 
        WHEN (SELECT COUNT(*) FROM deliveries WHERE company_id IS NULL) = 0
         AND (SELECT COUNT(*) FROM expenses WHERE company_id IS NULL) = 0
         AND (SELECT COUNT(*) FROM purchase_orders WHERE company_id IS NULL) = 0
        THEN '✅ ALL RECORDS HAVE COMPANY_ID'
        ELSE '⚠️ SOME RECORDS MISSING COMPANY_ID'
    END as status;

SELECT '════════════════════════════════════════════════' as separator;
SELECT '📝 NEXT STEP: Wait 30 seconds, then test your app!' as instruction;
SELECT '════════════════════════════════════════════════' as separator;
