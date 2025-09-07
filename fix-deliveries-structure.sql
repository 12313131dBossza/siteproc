-- Fix deliveries table to match API expectations
-- This adds missing columns the API needs

-- Show current structure first
SELECT 'BEFORE - Current deliveries table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deliveries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS order_id text DEFAULT 'ORD-' || extract(epoch from now());
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_date timestamptz DEFAULT now();
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS driver_name text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS total_amount decimal(12,2) DEFAULT 0;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- Required by API filters and auditing
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Ensure index for fast company scoping
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);

-- Ensure delivery_items table exists with the expected columns
CREATE TABLE IF NOT EXISTS public.delivery_items (
	id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
	delivery_id uuid REFERENCES public.deliveries(id) ON DELETE CASCADE,
	product_name text NOT NULL,
	quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
	unit text NOT NULL DEFAULT 'pieces',
	unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
	total_price numeric(12,2) NOT NULL,
	created_at timestamptz DEFAULT now()
);

-- Helpful index for joining items to deliveries
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON public.delivery_items(delivery_id);

-- Show updated structure
SELECT 'AFTER - Updated deliveries table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deliveries' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Delivery items table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'delivery_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Quick sanity check counts
SELECT 'deliveries_count' as metric, COUNT(*) FROM public.deliveries;
SELECT 'delivery_items_count' as metric, COUNT(*) FROM public.delivery_items;

SELECT 'Deliveries table structure fixed!' as status;
