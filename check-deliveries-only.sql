-- Check specifically for delivery tables
SELECT 'DELIVERY TABLE DIAGNOSTIC' as info;

-- Check if deliveries table exists
SELECT 
  'Deliveries Table Check:' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliveries' AND table_schema = 'public') THEN '✅ deliveries table exists'
    ELSE '❌ deliveries table MISSING'
  END as deliveries_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_items' AND table_schema = 'public') THEN '✅ delivery_items table exists'
    ELSE '❌ delivery_items table MISSING'
  END as delivery_items_status;

-- If deliveries table exists, show its structure
SELECT 'Deliveries table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'deliveries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- If delivery_items table exists, show its structure  
SELECT 'Delivery_items table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'delivery_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current data counts
SELECT 'Current deliveries count:' as info, COUNT(*) as count 
FROM public.deliveries;
