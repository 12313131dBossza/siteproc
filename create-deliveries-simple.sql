-- Simple Delivery Tables Creation (No Foreign Keys)
-- Run this in your Supabase SQL Editor

-- 1. Create deliveries table (without foreign keys)
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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for deliveries table

-- Policy: Users can only see deliveries from their company
CREATE POLICY "deliveries_select_company" ON public.deliveries
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert deliveries for their company
CREATE POLICY "deliveries_insert_company" ON public.deliveries
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Policy: Only admins/managers can update deliveries
CREATE POLICY "deliveries_update_admin" ON public.deliveries
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager', 'owner', 'bookkeeper')
        )
    );

-- Policy: Only admins can delete deliveries
CREATE POLICY "deliveries_delete_admin" ON public.deliveries
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- 5. Create RLS policies for delivery_items table

-- Policy: Users can see items for deliveries in their company
CREATE POLICY "delivery_items_select_company" ON public.delivery_items
    FOR SELECT USING (
        delivery_id IN (
            SELECT id FROM public.deliveries 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy: Users can insert items for deliveries they create
CREATE POLICY "delivery_items_insert_company" ON public.delivery_items
    FOR INSERT WITH CHECK (
        delivery_id IN (
            SELECT id FROM public.deliveries 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy: Only admins/managers can update delivery items
CREATE POLICY "delivery_items_update_admin" ON public.delivery_items
    FOR UPDATE USING (
        delivery_id IN (
            SELECT id FROM public.deliveries 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles 
                WHERE id = auth.uid()
            )
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'manager', 'owner', 'bookkeeper')
            )
        )
    );

-- Policy: Only admins can delete delivery items
CREATE POLICY "delivery_items_delete_admin" ON public.delivery_items
    FOR DELETE USING (
        delivery_id IN (
            SELECT id FROM public.deliveries 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles 
                WHERE id = auth.uid()
            )
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'owner')
            )
        )
    );

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON public.deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_by ON public.deliveries(created_by);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON public.deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON public.delivery_items(delivery_id);

-- 7. Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to update updated_at on deliveries
DROP TRIGGER IF EXISTS handle_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER handle_deliveries_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Grant permissions
GRANT ALL ON public.deliveries TO authenticated;
GRANT ALL ON public.delivery_items TO authenticated;

-- 10. Verify tables were created
SELECT 
    'Deliveries table created!' as status,
    count(*) as delivery_count 
FROM public.deliveries;

SELECT 
    'Delivery items table created!' as status,
    count(*) as items_count 
FROM public.delivery_items;

-- 11. Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('deliveries', 'delivery_items')
ORDER BY table_name, ordinal_position;
