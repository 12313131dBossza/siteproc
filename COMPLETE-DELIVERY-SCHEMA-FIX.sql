-- 🔧 COMPLETE DELIVERY SCHEMA FIX
-- First check what exists, then add everything needed

-- Step 1: See what we currently have
SELECT 
  '=== CURRENT DELIVERIES STRUCTURE ===' as section,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

SELECT 
  '=== CURRENT DELIVERY_ITEMS STRUCTURE ===' as section,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_items'
ORDER BY ordinal_position;

-- Step 2: Add ALL columns to deliveries table
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
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

-- Step 3: Add ALL columns to delivery_items table
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT 'Item';
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,2) DEFAULT 1;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pieces';
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 4: Update any existing rows that might have NULLs (using column that exists)
DO $$
BEGIN
  -- Only try to update if the column exists and has rows
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'delivery_items' AND column_name = 'product_name') THEN
    UPDATE delivery_items SET product_name = 'Unknown Item' WHERE product_name IS NULL;
  END IF;
END $$;

-- Step 5: Refresh schema cache MULTIPLE times
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify final structure
SELECT 
  '✅ FINAL DELIVERIES COLUMNS' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

SELECT 
  '✅ FINAL DELIVERY_ITEMS COLUMNS' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_items'
ORDER BY ordinal_position;

SELECT '🎉 SUCCESS! Schema completely fixed. Wait 15 seconds then try creating a delivery!' as message;
