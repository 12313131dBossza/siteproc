-- =====================================================
-- Make company_id optional in products table
-- =====================================================

-- First, check the current constraint on company_id
SELECT 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'products' 
  AND kcu.column_name = 'company_id';

-- Check if company_id column allows NULL
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name = 'company_id';

-- Make company_id nullable if it isn't already
ALTER TABLE products 
ALTER COLUMN company_id DROP NOT NULL;

-- Verify existing products
SELECT 
  id,
  name,
  company_id,
  stock_quantity,
  price,
  category
FROM products
LIMIT 10;
