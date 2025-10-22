-- 🔧 FIX DELIVERY TABLES - Handle existing NULL values

-- Step 1: Check for NULL product_name values
SELECT 
  '=== NULL PRODUCT NAMES ===' as section,
  COUNT(*) as null_count
FROM delivery_items
WHERE product_name IS NULL;

-- Step 2: Update NULL product_name to placeholder
UPDATE delivery_items
SET product_name = 'Unknown Item'
WHERE product_name IS NULL;

-- Step 3: Now add columns (without NOT NULL on product_name first)
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS order_uuid UUID;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS proof_urls JSONB;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 4: Add delivery_items columns WITHOUT NOT NULL constraint
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS product_name TEXT; -- No NOT NULL yet
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,2) DEFAULT 1;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pieces';
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 5: Set default value for any remaining NULL product_name
UPDATE delivery_items
SET product_name = 'Unknown Item'
WHERE product_name IS NULL;

-- Step 6: NOW add NOT NULL constraint after data is fixed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'delivery_items' AND column_name = 'product_name'
  ) THEN
    ALTER TABLE delivery_items ALTER COLUMN product_name SET NOT NULL;
  END IF;
END $$;

-- Step 7: Refresh schema cache (TWICE to be sure)
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- Step 8: Verify deliveries columns
SELECT 
  '✅ DELIVERIES COLUMNS' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

-- Step 9: Verify delivery_items columns
SELECT 
  '✅ DELIVERY_ITEMS COLUMNS' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_items'
ORDER BY ordinal_position;

SELECT '🎉 DONE! Schema updated and cache refreshed. Wait 10 seconds then try creating a delivery!' as message;
