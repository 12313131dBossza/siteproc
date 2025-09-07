-- MINIMAL: Just create the bare tables first
-- No indexes, no RLS, no nothing - just tables

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  supplier_id UUID,
  order_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  delivery_address TEXT,
  delivery_date DATE,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  product_id UUID,
  ordered_qty DECIMAL(10,2),
  delivered_qty DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  product_id UUID,
  delivered_qty DECIMAL(10,2),
  delivered_at TIMESTAMPTZ DEFAULT now(),
  note TEXT,
  proof_url TEXT,
  supplier_id UUID,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- That's it! Just verify they exist
SELECT 'Tables created!' as status;
SELECT tablename FROM pg_tables WHERE tablename IN ('orders', 'order_items', 'deliveries') ORDER BY tablename;
