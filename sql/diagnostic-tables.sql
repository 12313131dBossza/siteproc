-- Diagnostic script to check what tables exist
-- Run this to see what's currently in your database

-- Check what tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if products table specifically exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') 
    THEN 'Products table EXISTS' 
    ELSE 'Products table DOES NOT EXIST' 
  END as products_status;

-- If products exists, count rows
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        RAISE NOTICE 'Products table found - checking row count...';
        PERFORM * FROM public.products LIMIT 1;
        RAISE NOTICE 'Products table is accessible!';
    ELSE
        RAISE NOTICE 'Products table does not exist in public schema';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error accessing products table: %', SQLERRM;
END $$;
