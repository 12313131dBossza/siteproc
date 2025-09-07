-- SIMPLE FIX: Create Core Tables Only
-- Run this first to create the basic order system tables

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  supplier_id UUID,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  delivery_address TEXT,
  delivery_date DATE,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  ordered_qty DECIMAL(10,2) NOT NULL CHECK (ordered_qty > 0),
  delivered_qty DECIMAL(10,2) DEFAULT 0 CHECK (delivered_qty >= 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(12,2) GENERATED ALWAYS AS (ordered_qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  delivered_qty DECIMAL(10,2) NOT NULL CHECK (delivered_qty > 0),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  proof_url TEXT,
  supplier_id UUID,
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON order_items FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON deliveries FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON deliveries TO authenticated;

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
SELECT tablename FROM pg_tables WHERE tablename IN ('orders', 'order_items', 'deliveries');
