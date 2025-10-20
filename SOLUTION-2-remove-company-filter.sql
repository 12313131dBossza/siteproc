-- =====================================================
-- OPTION 2: Set all products to NULL company_id
-- =====================================================
-- This removes company filtering, showing all products to everyone
-- NOT RECOMMENDED for production multi-tenant apps

UPDATE products SET company_id = NULL;

-- Verify
SELECT 
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE company_id IS NULL) as products_with_no_company
FROM products;
