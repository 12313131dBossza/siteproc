-- Add RLS and permissions to the tables we just created
-- Run this after the minimal tables script

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all access for now - we'll secure later)
CREATE POLICY "allow_all_orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_deliveries" ON deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON deliveries TO authenticated;

-- Verify policies are created
SELECT 'RLS and permissions added!' as status;

-- Check existing data
SELECT 'Orders count:' as info, COUNT(*) as count FROM orders;
SELECT 'Order items count:' as info, COUNT(*) as count FROM order_items;
SELECT 'Deliveries count:' as info, COUNT(*) as count FROM deliveries;
