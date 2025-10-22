-- TEMPORARY FIX: Disable RLS on products to test
-- This will help us identify if RLS is still the problem

-- Temporarily disable RLS (NOT for production, just for testing!)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Try to get products now
SELECT 'Testing SELECT without RLS:' as test;
SELECT id, name, company_id, status 
FROM products 
LIMIT 3;

-- After testing, you can re-enable RLS with:
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
