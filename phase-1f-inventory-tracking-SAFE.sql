-- =====================================================
-- Phase 1F: Inventory Tracking Enhancement (SAFE VERSION)
-- =====================================================
-- This migration adds comprehensive inventory management to the products table
-- SAFE: Uses IF NOT EXISTS and DROP IF EXISTS to avoid errors on re-run

-- Step 1: Add inventory tracking columns to existing products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_stock_level INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS last_restock_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stock_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_email TEXT,
  ADD COLUMN IF NOT EXISTS supplier_phone TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ordered TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add constraints only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_status_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_status_check 
      CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_status_check 
      CHECK (status IN ('active', 'inactive', 'discontinued'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_rating_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_rating_check 
      CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

-- Migrate existing 'stock' column to 'stock_quantity' if needed
UPDATE products 
SET stock_quantity = COALESCE(stock, 0)
WHERE stock_quantity = 0 AND stock IS NOT NULL;

-- Step 2: Create inventory_transactions table for audit trail
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'damaged', 'theft', 'count', 'transfer')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  unit_cost DECIMAL(12,2),
  total_cost DECIMAL(12,2),
  reference_type TEXT CHECK (reference_type IN ('order', 'delivery', 'manual', 'system')),
  reference_id UUID,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_id ON inventory_transactions(company_id);

-- Step 3: Create inventory_alerts table for low stock notifications
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstocked', 'reorder')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product_id ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_resolved ON inventory_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_company_id ON inventory_alerts(company_id);

-- Step 4: Update products indexes
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Step 5: Create function to automatically update stock_status
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stock_status based on stock_quantity
  IF NEW.stock_quantity <= 0 THEN
    NEW.stock_status := 'out_of_stock';
  ELSIF NEW.stock_quantity <= NEW.min_stock_level THEN
    NEW.stock_status := 'low_stock';
  ELSE
    NEW.stock_status := 'in_stock';
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock status updates
DROP TRIGGER IF EXISTS trigger_update_product_stock_status ON products;
CREATE TRIGGER trigger_update_product_stock_status
  BEFORE UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_status();

-- Step 6: Create function to log inventory transactions
CREATE OR REPLACE FUNCTION log_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
  quantity_diff INTEGER;
BEGIN
  -- Calculate quantity difference
  quantity_diff := NEW.stock_quantity - OLD.stock_quantity;
  
  -- Only log if there's a change
  IF quantity_diff != 0 THEN
    INSERT INTO inventory_transactions (
      product_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_type,
      notes,
      performed_by,
      company_id
    ) VALUES (
      NEW.id,
      CASE 
        WHEN quantity_diff > 0 THEN 'purchase'
        WHEN quantity_diff < 0 THEN 'sale'
        ELSE 'adjustment'
      END,
      quantity_diff,
      OLD.stock_quantity,
      NEW.stock_quantity,
      'system',
      'Automatic stock update',
      auth.uid(),
      NEW.company_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic transaction logging
DROP TRIGGER IF EXISTS trigger_log_inventory_transaction ON products;
CREATE TRIGGER trigger_log_inventory_transaction
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW
  WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
  EXECUTE FUNCTION log_inventory_transaction();

-- Step 7: Create function to generate inventory alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for low stock alert
  IF NEW.stock_quantity <= NEW.min_stock_level AND NEW.stock_quantity > 0 THEN
    INSERT INTO inventory_alerts (
      product_id,
      alert_type,
      message,
      severity,
      company_id
    ) VALUES (
      NEW.id,
      'low_stock',
      format('Product "%s" is running low on stock (%s remaining, minimum: %s)', 
             NEW.name, NEW.stock_quantity, NEW.min_stock_level),
      'warning',
      NEW.company_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for out of stock alert
  IF NEW.stock_quantity <= 0 THEN
    INSERT INTO inventory_alerts (
      product_id,
      alert_type,
      message,
      severity,
      company_id
    ) VALUES (
      NEW.id,
      'out_of_stock',
      format('Product "%s" is out of stock!', NEW.name),
      'critical',
      NEW.company_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for reorder point
  IF NEW.stock_quantity <= NEW.reorder_point THEN
    INSERT INTO inventory_alerts (
      product_id,
      alert_type,
      message,
      severity,
      company_id
    ) VALUES (
      NEW.id,
      'reorder',
      format('Product "%s" has reached reorder point. Suggest ordering %s units', 
             NEW.name, NEW.reorder_quantity),
      'info',
      NEW.company_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory alerts
DROP TRIGGER IF EXISTS trigger_check_inventory_alerts ON products;
CREATE TRIGGER trigger_check_inventory_alerts
  AFTER INSERT OR UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_alerts();

-- Step 8: Enable RLS on new tables
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "inventory_transactions_select" ON inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_insert" ON inventory_transactions;
DROP POLICY IF EXISTS "inventory_alerts_select" ON inventory_alerts;
DROP POLICY IF EXISTS "inventory_alerts_update" ON inventory_alerts;

-- RLS Policies for inventory_transactions
CREATE POLICY "inventory_transactions_select" ON inventory_transactions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "inventory_transactions_insert" ON inventory_transactions
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for inventory_alerts
CREATE POLICY "inventory_alerts_select" ON inventory_alerts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "inventory_alerts_update" ON inventory_alerts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Step 9: Add helpful comments
COMMENT ON TABLE inventory_transactions IS 'Audit trail of all inventory movements';
COMMENT ON TABLE inventory_alerts IS 'System-generated alerts for inventory issues';
COMMENT ON COLUMN products.stock_quantity IS 'Current quantity in stock';
COMMENT ON COLUMN products.min_stock_level IS 'Minimum stock level before low stock alert';
COMMENT ON COLUMN products.reorder_point IS 'Stock level at which reorder alert is triggered';
COMMENT ON COLUMN products.reorder_quantity IS 'Suggested quantity to reorder';
COMMENT ON COLUMN products.stock_status IS 'Automatically calculated based on stock_quantity';

-- Step 10: Create helpful views
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.*,
  (p.min_stock_level - p.stock_quantity) AS shortage_quantity,
  (p.reorder_quantity * p.price) AS estimated_reorder_cost
FROM products p
WHERE p.stock_quantity <= p.min_stock_level
  AND p.status = 'active'
ORDER BY p.stock_quantity ASC;

CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
  p.category,
  COUNT(*) AS total_products,
  SUM(p.stock_quantity) AS total_stock,
  SUM(p.stock_quantity * p.price) AS total_value,
  COUNT(*) FILTER (WHERE p.stock_quantity <= p.min_stock_level) AS low_stock_count,
  COUNT(*) FILTER (WHERE p.stock_quantity = 0) AS out_of_stock_count
FROM products p
WHERE p.status = 'active'
GROUP BY p.category
ORDER BY total_value DESC;

-- ✅ Phase 1F: Inventory Tracking Enhancement Complete!
-- 📊 Added inventory tracking columns to products table
-- 📝 Created inventory_transactions table for audit trail
-- 🚨 Created inventory_alerts table for notifications
-- ⚡ Added automatic triggers for status updates and alerts
-- 🔒 Configured RLS policies for security
-- 📈 Created helpful views for reporting
