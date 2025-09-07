-- MINIMAL: Just create the delivery tables first
-- No RLS, no complex policies - just the basic tables

-- 1. Create deliveries table (basic structure)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL,
    delivery_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    driver_name TEXT,
    vehicle_number TEXT,
    notes TEXT,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    company_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create delivery_items table
CREATE TABLE IF NOT EXISTS public.delivery_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'pieces',
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Grant basic permissions
GRANT ALL ON public.deliveries TO authenticated;
GRANT ALL ON public.delivery_items TO authenticated;

-- 4. Simple verification
SELECT 'Delivery tables created successfully!' as status;
