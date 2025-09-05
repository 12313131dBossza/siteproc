-- Seed Realistic Data for SiteProc
-- Run this in Supabase SQL Editor after RLS fix

-- Step 1: Insert 10 sample products
INSERT INTO public.products (name, description, price, unit, category, created_at) VALUES
  ('Cement Bag 50kg', 'High-grade Portland cement for construction', 12.50, 'bag', 'materials', now()),
  ('Steel Rod 10mm', 'Reinforcement steel bar 10mm diameter', 45.00, 'meter', 'materials', now()),
  ('PVC Pipe 1.5in', 'PVC drainage pipe 1.5 inch diameter', 8.75, 'meter', 'materials', now()),
  ('Paint Bucket 20L', 'Exterior wall paint, weather resistant', 85.00, 'bucket', 'materials', now()),
  ('Concrete Mixer', 'Portable concrete mixer 150L capacity', 450.00, 'unit', 'equipment', now()),
  ('Safety Helmet', 'Hard hat safety helmet, ANSI approved', 25.00, 'unit', 'safety', now()),
  ('Wire Mesh 6mm', 'Welded wire mesh for concrete reinforcement', 35.00, 'sqm', 'materials', now()),
  ('Power Drill', 'Heavy duty electric drill with bits', 120.00, 'unit', 'tools', now()),
  ('Gravel 20mm', 'Construction aggregate gravel', 18.00, 'ton', 'materials', now()),
  ('Scaffold Tube', 'Steel scaffolding tube 48mm', 22.00, 'meter', 'equipment', now())
ON CONFLICT (name) DO NOTHING;

-- Step 2: Insert 5 sample expenses (need to get a real user ID first)
-- Get the first available user ID for sample data
DO $$
DECLARE
    sample_user_id uuid;
    admin_user_id uuid;
BEGIN
    -- Get first user for sample expenses
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- Get admin user if exists
    SELECT u.id INTO admin_user_id 
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE p.role IN ('admin', 'owner')
    LIMIT 1;
    
    -- Use admin if available, otherwise use first user
    IF admin_user_id IS NOT NULL THEN
        sample_user_id := admin_user_id;
    END IF;
    
    -- Insert sample expenses if we have a user
    IF sample_user_id IS NOT NULL THEN
        INSERT INTO public.expenses (
            vendor, category, amount, notes, status, user_id, created_at, updated_at
        ) VALUES
            ('ABC Cement Supplies', 'materials', 1250.00, 'Bulk cement purchase for Phase 1 construction', 'approved', sample_user_id, now() - interval '5 days', now()),
            ('Downtown Property Rentals', 'other', 2500.00, 'Site office rental for Q3 2025', 'approved', sample_user_id, now() - interval '3 days', now()),
            ('City Construction Crew', 'labor', 3200.00, 'Weekly wages for 4 construction workers', 'approved', sample_user_id, now() - interval '2 days', now()),
            ('Tools & Hardware Store', 'other', 485.00, 'Power tools and safety equipment purchase', 'pending', sample_user_id, now() - interval '1 day', now()),
            ('Metro Transport Services', 'other', 320.00, 'Material delivery from warehouse to site', 'pending', sample_user_id, now(), now())
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 3: Insert sample orders (need company_id)
-- This will create orders after we have company structure
DO $$
DECLARE
    sample_company_id uuid;
    sample_user_id uuid;
    admin_user_id uuid;
BEGIN
    -- Get first company
    SELECT id INTO sample_company_id FROM public.companies LIMIT 1;
    
    -- Get users
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    SELECT u.id INTO admin_user_id 
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE p.role IN ('admin', 'owner')
    LIMIT 1;
    
    -- Create sample orders if we have the required data
    IF sample_company_id IS NOT NULL AND sample_user_id IS NOT NULL THEN
        -- Insert a few sample orders with different statuses
        INSERT INTO public.orders (
            company_id, 
            created_by, 
            total_amount, 
            status, 
            supplier_name,
            delivery_address,
            notes,
            created_at,
            updated_at
        ) VALUES
            (sample_company_id, sample_user_id, 567.50, 'approved', 'Construction Supply Co', '123 Main St, Construction Site A', 'Urgent order for steel rods and cement', now() - interval '4 days', now()),
            (sample_company_id, sample_user_id, 1200.00, 'pending', 'Hardware Plus', '456 Site Blvd, Project Location B', 'Tools and safety equipment for new project', now() - interval '1 day', now()),
            (sample_company_id, sample_user_id, 890.25, 'approved', 'Metro Materials', '789 Construction Ave, Site C', 'PVC pipes and fittings for plumbing phase', now() - interval '2 days', now())
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 4: Create some sample order items
DO $$
DECLARE
    sample_order_id uuid;
    product_ids uuid[];
BEGIN
    -- Get a sample order
    SELECT id INTO sample_order_id FROM public.orders LIMIT 1;
    
    -- Get some product IDs
    SELECT array_agg(id) INTO product_ids FROM public.products LIMIT 3;
    
    -- Create order items if we have data
    IF sample_order_id IS NOT NULL AND array_length(product_ids, 1) > 0 THEN
        INSERT INTO public.order_items (
            order_id, product_id, quantity, unit_price, total_price
        ) VALUES
            (sample_order_id, product_ids[1], 10, 12.50, 125.00),
            (sample_order_id, product_ids[2], 5, 45.00, 225.00),
            (sample_order_id, product_ids[3], 3, 8.75, 26.25)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Verification queries
SELECT 'Products inserted:' as info, count(*) as count FROM public.products;
SELECT 'Expenses inserted:' as info, count(*) as count FROM public.expenses;
SELECT 'Orders inserted:' as info, count(*) as count FROM public.orders;
SELECT 'Order items inserted:' as info, count(*) as count FROM public.order_items;

-- Show sample data
SELECT 'Sample Products:' as section, name, price, unit, category FROM public.products LIMIT 5;
SELECT 'Sample Expenses:' as section, vendor, amount, status, category FROM public.expenses LIMIT 5;
