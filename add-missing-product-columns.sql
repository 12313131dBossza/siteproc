-- Add missing columns to products table
-- These columns are expected by the API but don't exist in the database

-- Add supplier and inventory management columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS supplier_email TEXT,
ADD COLUMN IF NOT EXISTS supplier_phone TEXT,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER,
ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER,
ADD COLUMN IF NOT EXISTS last_restock_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stock_status TEXT,
ADD COLUMN IF NOT EXISTS supplier_id UUID,
ADD COLUMN IF NOT EXISTS last_ordered TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0.0;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
