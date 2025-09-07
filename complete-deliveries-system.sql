-- COMPLETE DELIVERIES SYSTEM IMPLEMENTATION
-- This script adds all triggers, RLS policies, storage buckets, and functions

-- First, let's make sure we have all required tables with proper structure
-- (They should already exist from minimal-tables.sql, but let's verify)

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Create products table if it doesn't exist (needed for stock updates)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'pcs',
  stock_qty DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set storage policies for delivery-proofs bucket
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'delivery-proofs');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own uploads" ON storage.objects 
FOR UPDATE USING (bucket_id = 'delivery-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update product stock when delivery is recorded
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Increase product stock by delivered quantity
  UPDATE products 
  SET 
    stock_qty = stock_qty + NEW.delivered_qty,
    updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update order status based on deliveries
CREATE OR REPLACE FUNCTION update_order_status()
RETURNS TRIGGER AS $$
DECLARE
  total_ordered DECIMAL(10,2);
  total_delivered DECIMAL(10,2);
  order_status TEXT;
BEGIN
  -- Calculate totals for this order
  SELECT 
    COALESCE(SUM(ordered_qty), 0),
    COALESCE(SUM(delivered_qty), 0)
  INTO total_ordered, total_delivered
  FROM order_items 
  WHERE order_id = NEW.order_id;
  
  -- Update delivered_qty in order_items
  UPDATE order_items 
  SET 
    delivered_qty = delivered_qty + NEW.delivered_qty,
    updated_at = now()
  WHERE order_id = NEW.order_id AND product_id = NEW.product_id;
  
  -- Determine new order status
  IF total_delivered = 0 THEN
    order_status := 'approved';
  ELSIF total_delivered >= total_ordered THEN
    order_status := 'delivered';
  ELSE
    order_status := 'partially_delivered';
  END IF;
  
  -- Update order status
  UPDATE orders 
  SET 
    status = order_status,
    updated_at = now()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to send delivery notifications
CREATE OR REPLACE FUNCTION send_delivery_notifications()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  is_fully_delivered BOOLEAN;
BEGIN
  -- Get order details
  SELECT o.*, p.email as requester_email, p.full_name as requester_name
  INTO order_record
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.created_by
  WHERE o.id = NEW.order_id;
  
  -- Check if order is now fully delivered
  SELECT 
    COALESCE(SUM(oi.ordered_qty), 0) <= COALESCE(SUM(oi.delivered_qty), 0)
  INTO is_fully_delivered
  FROM order_items oi
  WHERE oi.order_id = NEW.order_id;
  
  -- Insert notification for admins (always)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    company_id
  )
  SELECT 
    p.id,
    'delivery_recorded',
    'New Delivery Recorded',
    'A delivery has been recorded for Order #' || order_record.order_number,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'delivery_id', NEW.id,
      'delivered_qty', NEW.delivered_qty
    ),
    NEW.company_id
  FROM profiles p 
  WHERE p.company_id = NEW.company_id 
    AND p.role IN ('admin', 'owner');
  
  -- If fully delivered, notify requester + admins
  IF is_fully_delivered THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      company_id
    )
    SELECT 
      p.id,
      'order_delivered',
      'Order Fully Delivered',
      'Order #' || order_record.order_number || ' has been fully delivered',
      jsonb_build_object(
        'order_id', NEW.order_id,
        'order_number', order_record.order_number
      ),
      NEW.company_id
    FROM profiles p 
    WHERE p.company_id = NEW.company_id 
      AND (p.role IN ('admin', 'owner') OR p.id = order_record.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_product_stock ON deliveries;
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

DROP TRIGGER IF EXISTS trigger_update_order_status ON deliveries;  
CREATE TRIGGER trigger_update_order_status
  AFTER INSERT ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_order_status();

DROP TRIGGER IF EXISTS trigger_send_delivery_notifications ON deliveries;
CREATE TRIGGER trigger_send_delivery_notifications
  AFTER INSERT ON deliveries
  FOR EACH ROW EXECUTE FUNCTION send_delivery_notifications();

-- RLS POLICIES FOR DELIVERIES
DROP POLICY IF EXISTS "Admins full access deliveries" ON deliveries;
CREATE POLICY "Admins full access deliveries" ON deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND company_id = deliveries.company_id 
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Members can insert deliveries" ON deliveries;
CREATE POLICY "Members can insert deliveries" ON deliveries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND company_id = deliveries.company_id 
        AND role IN ('admin', 'owner', 'member', 'bookkeeper')
    )
  );

DROP POLICY IF EXISTS "Viewers read-only deliveries" ON deliveries;
CREATE POLICY "Viewers read-only deliveries" ON deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND company_id = deliveries.company_id
    )
  );

-- RLS POLICIES FOR PRODUCTS
DROP POLICY IF EXISTS "Company members access products" ON products;
CREATE POLICY "Company members access products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND company_id = products.company_id
    )
  );

-- RLS POLICIES FOR ORDERS (if not already set)
DROP POLICY IF EXISTS "Company members access orders" ON orders;
CREATE POLICY "Company members access orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND company_id = orders.company_id
    )
  );

-- RLS POLICIES FOR ORDER_ITEMS (if not already set)  
DROP POLICY IF EXISTS "Company members access order_items" ON order_items;
CREATE POLICY "Company members access order_items" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN profiles p ON p.company_id = o.company_id
      WHERE o.id = order_items.order_id 
        AND p.id = auth.uid()
    )
  );

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Add some sample products for testing
INSERT INTO products (id, company_id, name, sku, unit, stock_qty, unit_price) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Steel Rebar 12mm', 'STEEL-RBR-12', 'tons', 50.00, 800.00),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Cement Type I', 'CEMENT-T1', 'bags', 200.00, 25.00),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Concrete Blocks', 'BLOCK-STD', 'pcs', 1000.00, 5.50)
ON CONFLICT (id) DO NOTHING;

-- Verify everything was created
SELECT 'Deliveries system implementation complete!' as status;

-- Check that all triggers exist
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%delivery%' OR trigger_name LIKE '%product_stock%' OR trigger_name LIKE '%order_status%'
ORDER BY trigger_name;

-- Check that all policies exist  
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('deliveries', 'products', 'orders', 'order_items', 'notifications')
ORDER BY tablename, policyname;
