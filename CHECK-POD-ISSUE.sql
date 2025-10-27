-- Quick diagnostic to check POD saving issue

-- 1. Check if proof_urls column exists
SELECT 
    'PROOF_URLS COLUMN CHECK' as check_type,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'proof_urls'
    ) as column_exists;

-- 2. Check recent deliveries and their proof_urls
SELECT 
    id,
    delivery_date,
    status,
    notes,
    proof_urls,
    project_id,
    company_id,
    created_at
FROM deliveries
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if there are any deliveries with proof_urls
SELECT 
    COUNT(*) as total_deliveries,
    COUNT(*) FILTER (WHERE proof_urls IS NOT NULL) as with_proof_urls,
    COUNT(*) FILTER (WHERE proof_urls IS NOT NULL AND jsonb_array_length(proof_urls) > 0) as with_valid_proof_urls
FROM deliveries;
