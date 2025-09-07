-- Create the missing delivery_items table
-- This will complete your delivery system

CREATE TABLE public.delivery_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id uuid REFERENCES public.deliveries(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    quantity decimal(10,2) NOT NULL,
    unit text DEFAULT 'pieces',
    unit_price decimal(10,2) DEFAULT 0,
    total_price decimal(12,2) DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Grant permissions
GRANT ALL ON public.delivery_items TO authenticated;

-- Verify it was created
SELECT 'delivery_items table created successfully!' as status;
SELECT COUNT(*) as items_count FROM public.delivery_items;
