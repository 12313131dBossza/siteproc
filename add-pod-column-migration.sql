    -- ============================================================================
    -- PHASE 1A: POD (Proof of Delivery) UPLOAD
    -- ============================================================================
    -- This migration adds the ability to upload and store proof of delivery files
    -- (images, PDFs) for each delivery record
    -- ============================================================================

    -- Step 1: Add proof_url column to deliveries table
    ALTER TABLE deliveries 
    ADD COLUMN IF NOT EXISTS proof_url TEXT;

    -- Add index for better query performance
    CREATE INDEX IF NOT EXISTS idx_deliveries_proof_url ON deliveries(proof_url) WHERE proof_url IS NOT NULL;

    -- Step 2: Verify the column exists
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'deliveries' AND column_name = 'proof_url'
        ) THEN
            RAISE NOTICE '✅ proof_url column added successfully to deliveries table';
        ELSE
            RAISE NOTICE '❌ ERROR: proof_url column was not added';
        END IF;
    END $$;

    -- Step 3: Show sample of updated structure
    SELECT 
        '✅ Migration Complete - Deliveries can now store POD URLs' as status;

    -- Step 4: Display current deliveries structure
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
    FROM information_schema.columns
    WHERE table_name = 'deliveries'
    ORDER BY ordinal_position;

    -- Step 5: Sample query to show deliveries with/without POD
    SELECT 
        id,
        project_id,
        delivery_date,
        status,
        proof_url,
        CASE 
            WHEN proof_url IS NOT NULL THEN '✅ Has POD'
            ELSE '❌ No POD'
        END as pod_status,
        notes
    FROM deliveries
    ORDER BY delivery_date DESC
    LIMIT 10;
