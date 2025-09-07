-- Fix company_id mismatch for your deliveries
-- Your correct company_id: 00000000-0000-4000-8000-000000000001
-- Wrong company_id found: 00000000-0000-4000-8000-000347ead33

-- Update deliveries to your correct company
UPDATE public.deliveries 
SET company_id = '00000000-0000-4000-8000-000000000001'
WHERE company_id = '00000000-0000-4000-8000-000347ead33';

-- Update delivery_items to match
UPDATE public.delivery_items 
SET company_id = '00000000-0000-4000-8000-000000000001'
WHERE company_id = '00000000-0000-4000-8000-000347ead33';

-- Verify the fix
SELECT 'Updated deliveries:' as info;
SELECT id, company_id, total_amount 
FROM public.deliveries 
WHERE company_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC;

SELECT 'Updated delivery items:' as info;
SELECT di.id, di.product_name, di.company_id, d.id as delivery_id
FROM public.delivery_items di
JOIN public.deliveries d ON di.delivery_id = d.id
WHERE d.company_id = '00000000-0000-4000-8000-000000000001'
ORDER BY di.created_at DESC;
