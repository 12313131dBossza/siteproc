-- Add ALL missing columns to purchase_orders table that the convert endpoint needs

ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS product TEXT,
ADD COLUMN IF NOT EXISTS quantity NUMERIC,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC,
ADD COLUMN IF NOT EXISTS total NUMERIC,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify all columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ ALL PURCHASE_ORDERS COLUMNS ADDED!' as status;
