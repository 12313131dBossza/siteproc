-- Check if purchase_orders and deliveries tables exist and have company_id column
-- Run this in Supabase SQL Editor

-- Check purchase_orders table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;

-- Check deliveries table structure  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
ORDER BY ordinal_position;

-- Count records in both tables
SELECT 
  'purchase_orders' as table_name,
  COUNT(*) as total_count
FROM purchase_orders
UNION ALL
SELECT 
  'deliveries' as table_name,
  COUNT(*) as total_count
FROM deliveries;
