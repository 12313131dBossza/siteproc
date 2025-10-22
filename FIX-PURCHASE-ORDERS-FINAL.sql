-- FINAL FIX: Ensure purchase_orders has the correct schema
-- The orders API expects 'amount', not 'total'

-- First, check what columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
  AND column_name IN ('amount', 'total', 'description', 'product', 'product_name')
ORDER BY column_name;

-- If 'total' exists but 'amount' doesn't, rename 'total' to 'amount'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'total'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'amount'
    ) THEN
        ALTER TABLE purchase_orders RENAME COLUMN total TO amount;
        RAISE NOTICE 'Renamed total to amount';
    END IF;
    
    -- If 'product' exists but 'product_name' doesn't, rename 'product' to 'product_name'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'product'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE purchase_orders RENAME COLUMN product TO product_name;
        RAISE NOTICE 'Renamed product to product_name';
    END IF;
END $$;

-- Ensure all required columns exist
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS amount NUMERIC,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS quantity NUMERIC,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS requested_by UUID,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Make columns nullable
ALTER TABLE purchase_orders
ALTER COLUMN project_id DROP NOT NULL,
ALTER COLUMN amount DROP NOT NULL,
ALTER COLUMN description DROP NOT NULL,
ALTER COLUMN vendor DROP NOT NULL,
ALTER COLUMN product_name DROP NOT NULL,
ALTER COLUMN quantity DROP NOT NULL,
ALTER COLUMN unit_price DROP NOT NULL;

-- Verify final structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ PURCHASE_ORDERS SCHEMA FIXED!' as status;
