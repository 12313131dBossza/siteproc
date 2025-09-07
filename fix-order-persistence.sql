-- Fix Order Persistence Issue
-- Run this in Supabase SQL Editor to enable order storage

-- Step 1: Check if core tables exist
SELECT 'Checking existing tables...' as status;

-- Check if orders table exists and has correct structure
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('orders', 'order_items', 'deliveries', 'companies', 'profiles')
ORDER BY table_name, ordinal_position;

-- Step 2: Ensure orders table exists with proper structure
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  delivery_address TEXT,
  delivery_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Ensure order_items table exists
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  ordered_qty DECIMAL(10,2) NOT NULL CHECK (ordered_qty > 0),
  delivered_qty DECIMAL(10,2) DEFAULT 0 CHECK (delivered_qty >= 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(12,2) GENERATED ALWAYS AS (ordered_qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Create deliveries table (from your migration)
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delivered_qty DECIMAL(10,2) NOT NULL CHECK (delivered_qty > 0),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  proof_url TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 5: Create essential indexes
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);

-- Step 6: Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Step 7: Create basic RLS policies for orders
DROP POLICY IF EXISTS "Users can view orders from their company" ON orders;
CREATE POLICY "Users can view orders from their company"
  ON orders FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create orders for their company" ON orders;
CREATE POLICY "Users can create orders for their company"
  ON orders FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update orders from their company" ON orders;
CREATE POLICY "Users can update orders from their company"
  ON orders FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Step 8: Create RLS policies for order_items
DROP POLICY IF EXISTS "Users can view order items from their company" ON order_items;
CREATE POLICY "Users can view order items from their company"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage order items from their company" ON order_items;
CREATE POLICY "Users can manage order items from their company"
  ON order_items FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Step 9: Create RLS policies for deliveries (from your migration)
DROP POLICY IF EXISTS "Users can view deliveries from their company" ON deliveries;
CREATE POLICY "Users can view deliveries from their company"
  ON deliveries FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create deliveries for their company" ON deliveries;
CREATE POLICY "Members can create deliveries for their company"
  ON deliveries FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'bookkeeper', 'member')
    )
  );

-- Step 10: Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON deliveries TO authenticated;

-- Step 11: Verify the setup
SELECT 'Database setup complete!' as status;

-- Show tables that should now exist
SELECT 
  schemaname,
  tablename,
  tableowner,
  CASE 
    WHEN rowsecurity THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END as security_status
FROM pg_tables 
WHERE tablename IN ('orders', 'order_items', 'deliveries')
ORDER BY tablename;
