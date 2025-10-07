-- Migration: Add vendor, product_name, quantity, unit_price fields to purchase_orders
-- This allows orders to store detailed product information instead of just description/category
-- Date: 2024

-- Add new columns to purchase_orders table
ALTER TABLE purchase_orders 
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_product_name ON purchase_orders(product_name);

-- Verify the new columns exist
SELECT 
  '✅ Migration Complete - New Columns Added' as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'vendor'
  ) THEN '✅ vendor' ELSE '❌ vendor MISSING' END as vendor_column,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'product_name'
  ) THEN '✅ product_name' ELSE '❌ product_name MISSING' END as product_name_column,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'quantity'
  ) THEN '✅ quantity' ELSE '❌ quantity MISSING' END as quantity_column,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'unit_price'
  ) THEN '✅ unit_price' ELSE '❌ unit_price MISSING' END as unit_price_column;

-- Show sample of data structure
SELECT 
  'Sample Data After Migration:' as info;

SELECT 
  id,
  project_id,
  vendor,
  product_name,
  quantity,
  unit_price,
  amount,
  description,
  category,
  status,
  created_at
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 5;
