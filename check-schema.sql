-- 🔍 DISCOVER YOUR DATABASE SCHEMA
-- Run this first to see what columns actually exist in your tables

-- Check orders table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Check expenses table structure  
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;

-- Check deliveries table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deliveries'
ORDER BY ordinal_position;

-- Check projects table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
