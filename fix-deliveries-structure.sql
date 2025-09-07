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

-- If order_id exists but is not text, try to convert it to text to match API
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_schema='public' AND table_name='deliveries' AND column_name='order_id' AND data_type <> 'text'
	) THEN
		BEGIN
			ALTER TABLE public.deliveries ALTER COLUMN order_id TYPE text USING order_id::text;
		EXCEPTION WHEN others THEN
			RAISE NOTICE 'Could not alter deliveries.order_id to text (may be constrained by FK); leaving as-is.';
		END;
	END IF;
END $$;

-- Relax legacy columns that may block inserts (from older schema)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_schema='public' AND table_name='deliveries' AND column_name='product_id'
	) THEN
		BEGIN
			ALTER TABLE public.deliveries ALTER COLUMN product_id DROP NOT NULL;
		EXCEPTION WHEN others THEN
			RAISE NOTICE 'Could not drop NOT NULL on deliveries.product_id (safe to ignore if already nullable).';
		END;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_schema='public' AND table_name='deliveries' AND column_name='delivered_qty'
	) THEN
		BEGIN
			ALTER TABLE public.deliveries ALTER COLUMN delivered_qty DROP NOT NULL;
		EXCEPTION WHEN others THEN
			RAISE NOTICE 'Could not drop NOT NULL on deliveries.delivered_qty (safe to ignore if already nullable).';
		END;
	END IF;
END $$;

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
