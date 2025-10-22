-- 🔧 ADD ALL REQUIRED COLUMNS TO DELIVERIES TABLE

-- Add ALL missing columns that the API expects
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

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify all columns
SELECT 
  '✅ DELIVERIES COLUMNS' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deliveries'
ORDER BY ordinal_position;

-- Also check delivery_items table and add missing columns
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,2) NOT NULL DEFAULT 1;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pieces';
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Refresh schema cache again
NOTIFY pgrst, 'reload schema';

-- Verify delivery_items columns
SELECT 
  '✅ DELIVERY_ITEMS COLUMNS' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_items'
ORDER BY ordinal_position;

SELECT '🎉 DONE! All columns added. Wait 10 seconds then try creating a delivery!' as message;
