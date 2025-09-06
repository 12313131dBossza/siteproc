-- Migration: Add deliveries module for order fulfillment
-- Date: 2024-12-20
-- Description: Creates deliveries table, order_delivery_summary view, triggers, and RLS policies

-- Create deliveries table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_product_id ON deliveries(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivered_at ON deliveries(delivered_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_by ON deliveries(created_by);

-- Create order_delivery_summary view
CREATE OR REPLACE VIEW order_delivery_summary AS
SELECT 
  o.id as order_id,
  o.company_id,
  SUM(oi.ordered_qty) as total_ordered_qty,
  COALESCE(SUM(oi.delivered_qty), 0) as total_delivered_qty,
  ROUND(
    CASE 
      WHEN SUM(oi.ordered_qty) = 0 THEN 0 
      ELSE (COALESCE(SUM(oi.delivered_qty), 0) / SUM(oi.ordered_qty)) * 100 
    END, 2
  ) as delivery_percentage,
  COALESCE(SUM(oi.delivered_qty), 0) >= SUM(oi.ordered_qty) as is_fully_delivered,
  COUNT(DISTINCT d.id) as delivery_count,
  MAX(d.delivered_at) as last_delivery_date
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN deliveries d ON o.id = d.order_id
WHERE o.status IN ('approved', 'partially_delivered', 'delivered')
GROUP BY o.id, o.company_id;

-- Function to update order_items.delivered_qty based on deliveries
CREATE OR REPLACE FUNCTION update_order_item_delivered_qty()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add to delivered quantity
    UPDATE order_items 
    SET 
      delivered_qty = COALESCE(delivered_qty, 0) + NEW.delivered_qty,
      updated_at = now()
    WHERE order_id = NEW.order_id AND product_id = NEW.product_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract from delivered quantity
    UPDATE order_items 
    SET 
      delivered_qty = GREATEST(0, COALESCE(delivered_qty, 0) - OLD.delivered_qty),
      updated_at = now()
    WHERE order_id = OLD.order_id AND product_id = OLD.product_id;
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Adjust delivered quantity based on the change
    UPDATE order_items 
    SET 
      delivered_qty = GREATEST(0, COALESCE(delivered_qty, 0) - OLD.delivered_qty + NEW.delivered_qty),
      updated_at = now()
    WHERE order_id = NEW.order_id AND product_id = NEW.product_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update order status based on delivery progress
CREATE OR REPLACE FUNCTION update_order_delivery_status()
RETURNS TRIGGER AS $$
DECLARE
  order_summary RECORD;
BEGIN
  -- Get the order delivery summary for the affected order
  SELECT * INTO order_summary
  FROM order_delivery_summary 
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  IF order_summary IS NOT NULL THEN
    IF order_summary.is_fully_delivered THEN
      -- Mark order as delivered
      UPDATE orders 
      SET 
        status = 'delivered',
        updated_at = now()
      WHERE id = order_summary.order_id AND status != 'delivered';
    ELSIF order_summary.total_delivered_qty > 0 THEN
      -- Mark order as partially delivered
      UPDATE orders 
      SET 
        status = 'partially_delivered',
        updated_at = now()
      WHERE id = order_summary.order_id AND status = 'approved';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update delivered quantities when deliveries change
DROP TRIGGER IF EXISTS apply_delivery_effects ON deliveries;
CREATE TRIGGER apply_delivery_effects
  AFTER INSERT OR UPDATE OR DELETE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_order_item_delivered_qty();

-- Trigger to update order status based on delivery progress
DROP TRIGGER IF EXISTS update_order_status_on_delivery ON deliveries;
CREATE TRIGGER update_order_status_on_delivery
  AFTER INSERT OR UPDATE OR DELETE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_order_delivery_status();

-- RLS Policies for deliveries table
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see deliveries from their company
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

-- Policy: Members and above can create deliveries for their company
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

-- Policy: Only admins can update deliveries
DROP POLICY IF EXISTS "Admins can update deliveries" ON deliveries;
CREATE POLICY "Admins can update deliveries"
  ON deliveries FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'bookkeeper')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'bookkeeper')
    )
  );

-- Policy: Only admins can delete deliveries
DROP POLICY IF EXISTS "Admins can delete deliveries" ON deliveries;
CREATE POLICY "Admins can delete deliveries"
  ON deliveries FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'bookkeeper')
    )
  );

-- RLS Policies for order_delivery_summary view
ALTER VIEW order_delivery_summary SET (security_barrier = true);

-- Add delivered_qty column to order_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'delivered_qty'
  ) THEN
    ALTER TABLE order_items ADD COLUMN delivered_qty DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create index on delivered_qty for performance
CREATE INDEX IF NOT EXISTS idx_order_items_delivered_qty ON order_items(delivered_qty);

-- Grant necessary permissions
GRANT SELECT ON order_delivery_summary TO authenticated;
GRANT ALL ON deliveries TO authenticated;
