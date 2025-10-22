-- 🔧 FIX: Add missing created_by column to deliveries table

-- Step 1: Check current structure
SELECT 
  '=== CURRENT DELIVERIES COLUMNS ===' as section,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

-- Step 2: Add missing created_by column
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 3: Add company_id if missing
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Step 4: Add other potentially missing columns
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS proof_urls JSONB;

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS driver_name TEXT;

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 5: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify columns were added
SELECT 
  '=== UPDATED DELIVERIES COLUMNS ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

SELECT '✅ DONE! Schema cache refreshed. Try creating a delivery again!' as message;
