-- Check the actual structure of the orders table
-- Run this in Supabase SQL Editor to see what columns exist

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Also check what's actually in the orders table
SELECT * FROM public.orders LIMIT 5;
