-- Deliveries Module - Complete Database Setup
-- Run this in Supabase SQL Editor

-- Step 1: Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    delivered_qty numeric NOT NULL CHECK (delivered_qty > 0),
    delivered_at timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    proof_url text,
    supplier_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Step 2: Add company_id to orders table if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Step 3: Add company_id to products table if not exists  
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Step 4: Backfill company_id for orders (using user's company)
UPDATE public.orders 
SET company_id = (
    SELECT p.company_id 
    FROM public.profiles p 
    WHERE p.id = orders.created_by
)
WHERE company_id IS NULL 
AND created_by IS NOT NULL;

-- Step 5: Backfill company_id for products (set to first available company for now)
UPDATE public.products 
SET company_id = (
    SELECT id FROM public.companies ORDER BY created_at LIMIT 1
)
WHERE company_id IS NULL;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS deliveries_product_id_idx ON public.deliveries(product_id);
CREATE INDEX IF NOT EXISTS deliveries_company_id_idx ON public.deliveries(company_id);
CREATE INDEX IF NOT EXISTS deliveries_created_by_idx ON public.deliveries(created_by);
CREATE INDEX IF NOT EXISTS deliveries_delivered_at_idx ON public.deliveries(delivered_at);

CREATE INDEX IF NOT EXISTS orders_company_id_idx ON public.orders(company_id);
CREATE INDEX IF NOT EXISTS products_company_id_idx ON public.products(company_id);

-- Step 7: Create order_delivery_summary view
CREATE OR REPLACE VIEW public.order_delivery_summary AS
SELECT 
    o.id as order_id,
    o.company_id,
    oi.product_id,
    oi.quantity as ordered_qty,
    COALESCE(SUM(d.delivered_qty), 0) as delivered_qty,
    (oi.quantity - COALESCE(SUM(d.delivered_qty), 0)) as remaining_qty,
    CASE 
        WHEN COALESCE(SUM(d.delivered_qty), 0) = 0 THEN 'pending'
        WHEN COALESCE(SUM(d.delivered_qty), 0) >= oi.quantity THEN 'delivered' 
        ELSE 'partially_delivered'
    END as delivery_status,
    COUNT(d.id) as delivery_count,
    MAX(d.delivered_at) as last_delivery_at,
    p.name as product_name,
    p.sku as product_sku,
    p.unit as product_unit,
    oi.unit_price,
    oi.total_price
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.products p ON oi.product_id = p.id
LEFT JOIN public.deliveries d ON o.id = d.order_id AND oi.product_id = d.product_id
GROUP BY o.id, o.company_id, oi.product_id, oi.quantity, p.name, p.sku, p.unit, oi.unit_price, oi.total_price;

-- Step 8: Create delivery effects trigger function
CREATE OR REPLACE FUNCTION public.apply_delivery_effects()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product stock
    UPDATE public.products 
    SET stock = stock + NEW.delivered_qty,
        updated_at = now()
    WHERE id = NEW.product_id;
    
    -- Update order status based on delivery progress
    UPDATE public.orders
    SET status = (
        SELECT CASE 
            WHEN SUM(
                CASE 
                    WHEN ods.remaining_qty <= 0 THEN 1 
                    ELSE 0 
                END
            ) = COUNT(*) THEN 'delivered'
            WHEN SUM(
                CASE 
                    WHEN ods.delivered_qty > 0 THEN 1 
                    ELSE 0 
                END
            ) > 0 THEN 'partially_delivered'
            ELSE status -- Keep current status if no deliveries
        END
        FROM public.order_delivery_summary ods
        WHERE ods.order_id = NEW.order_id
    ),
    updated_at = now()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger
DROP TRIGGER IF EXISTS apply_delivery_effects_trigger ON public.deliveries;
CREATE TRIGGER apply_delivery_effects_trigger
    AFTER INSERT ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_delivery_effects();

-- Step 10: Enable RLS on deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for deliveries
DROP POLICY IF EXISTS "deliveries_select_company" ON public.deliveries;
CREATE POLICY "deliveries_select_company"
ON public.deliveries FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "deliveries_insert_company_members" ON public.deliveries;
CREATE POLICY "deliveries_insert_company_members"  
ON public.deliveries FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'bookkeeper', 'member')
    )
);

DROP POLICY IF EXISTS "deliveries_update_admins" ON public.deliveries;
CREATE POLICY "deliveries_update_admins"
ON public.deliveries FOR UPDATE
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'bookkeeper')
    )
);

DROP POLICY IF EXISTS "deliveries_delete_admins" ON public.deliveries;
CREATE POLICY "deliveries_delete_admins"
ON public.deliveries FOR DELETE
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'bookkeeper')
    )
);

-- Step 12: Service role bypass policy
CREATE POLICY "deliveries_service_role_bypass"
ON public.deliveries FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verification queries
SELECT 'Deliveries table created' as status, 
       COUNT(*) as existing_deliveries 
FROM public.deliveries;

SELECT 'Order delivery summary view' as status,
       COUNT(*) as orders_with_summary
FROM public.order_delivery_summary;

SELECT 'RLS policies created' as status,
       COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'deliveries' AND schemaname = 'public';
