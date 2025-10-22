-- SIMPLE FIX FOR PRODUCTS RLS POLICIES
-- Run this in Supabase SQL Editor (works without auth context)

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view products in their company" ON products;
DROP POLICY IF EXISTS "Users can view shared products" ON products;
DROP POLICY IF EXISTS "Users can view their company products" ON products;
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Admins can create products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create comprehensive SELECT policy (read access)
-- Users can see products from their company OR products with no company (shared)
CREATE POLICY "products_select_policy" ON products
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL 
    OR 
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Create INSERT policy (create products)
-- Authenticated users can create products
-- The company_id will be set by the API to match their profile
CREATE POLICY "products_insert_policy" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if company_id matches user's company
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR
    -- Or if company_id is null (shared products)
    company_id IS NULL
  );

-- Create UPDATE policy
-- Users can update products in their company
CREATE POLICY "products_update_policy" ON products
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR
    company_id IS NULL
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR
    company_id IS NULL
  );

-- Create DELETE policy
-- Users can delete products in their company
CREATE POLICY "products_delete_policy" ON products
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR
    company_id IS NULL
  );

-- Verify the new policies were created
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read products from your company or shared'
    WHEN cmd = 'INSERT' THEN 'Create products in your company'
    WHEN cmd = 'UPDATE' THEN 'Update products in your company'
    WHEN cmd = 'DELETE' THEN 'Delete products in your company'
  END as description
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY cmd;
