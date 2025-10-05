-- Create Sample Products for Order Testing
-- This script adds various construction materials with stock

-- Clear existing test products (optional - comment out if you want to keep existing data)
-- DELETE FROM products WHERE name LIKE '%TEST%' OR sku LIKE 'TEST%';

-- Insert sample construction products
INSERT INTO products (id, name, sku, price, stock, unit, category, created_at)
VALUES 
  -- Building Materials
  (gen_random_uuid(), 'Portland Cement', 'CEM-001', 12.50, 500, 'bags', 'Cement', NOW()),
  (gen_random_uuid(), 'Reinforced Steel Bars (12mm)', 'RSB-012', 850.00, 200, 'pcs', 'Steel', NOW()),
  (gen_random_uuid(), 'Concrete Blocks (6 inch)', 'BLK-006', 2.50, 1000, 'pcs', 'Blocks', NOW()),
  (gen_random_uuid(), 'River Sand (Fine)', 'SND-001', 35.00, 150, 'cubic meters', 'Aggregates', NOW()),
  (gen_random_uuid(), 'Gravel (3/4 inch)', 'GRV-034', 40.00, 120, 'cubic meters', 'Aggregates', NOW()),
  
  -- Plumbing Materials
  (gen_random_uuid(), 'PVC Pipe (4 inch)', 'PVC-004', 8.75, 300, 'meters', 'Plumbing', NOW()),
  (gen_random_uuid(), 'PVC Elbow (4 inch)', 'ELB-004', 2.25, 500, 'pcs', 'Plumbing', NOW()),
  (gen_random_uuid(), 'Ball Valve (1/2 inch)', 'BVL-012', 15.50, 100, 'pcs', 'Plumbing', NOW()),
  
  -- Electrical Materials
  (gen_random_uuid(), 'Electrical Wire 14 AWG', 'EWR-014', 125.00, 80, 'rolls', 'Electrical', NOW()),
  (gen_random_uuid(), 'Circuit Breaker 20A', 'CBR-020', 18.00, 150, 'pcs', 'Electrical', NOW()),
  (gen_random_uuid(), 'LED Bulb 12W', 'LED-012', 4.50, 200, 'pcs', 'Electrical', NOW()),
  
  -- Paint & Finishing
  (gen_random_uuid(), 'Acrylic Paint - White', 'PNT-WHT', 45.00, 60, 'gallons', 'Paint', NOW()),
  (gen_random_uuid(), 'Primer/Sealer', 'PRM-001', 38.00, 40, 'gallons', 'Paint', NOW()),
  (gen_random_uuid(), 'Sandpaper Assorted', 'SND-AST', 12.00, 100, 'packs', 'Finishing', NOW()),
  
  -- Wood & Lumber
  (gen_random_uuid(), 'Plywood 4x8 (12mm)', 'PLY-012', 32.00, 75, 'sheets', 'Wood', NOW()),
  (gen_random_uuid(), '2x4 Lumber (8 ft)', 'LMB-248', 8.50, 200, 'pcs', 'Wood', NOW()),
  (gen_random_uuid(), 'Hardwood Flooring', 'FLR-HRD', 65.00, 50, 'sq meters', 'Wood', NOW()),
  
  -- Tools & Hardware
  (gen_random_uuid(), 'Heavy Duty Nails (3 inch)', 'NLS-003', 15.00, 150, 'boxes', 'Hardware', NOW()),
  (gen_random_uuid(), 'Wood Screws Assorted', 'SCR-AST', 18.50, 120, 'boxes', 'Hardware', NOW()),
  (gen_random_uuid(), 'Construction Adhesive', 'ADH-001', 8.75, 80, 'tubes', 'Hardware', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify products were created
SELECT 
  name,
  sku,
  category,
  price,
  stock,
  unit,
  CONCAT('$', price, ' per ', unit) as price_display,
  CONCAT(stock, ' ', unit, ' available') as stock_display
FROM products
ORDER BY category, name;

-- Show product count by category
SELECT 
  category,
  COUNT(*) as product_count,
  SUM(stock) as total_stock
FROM products
GROUP BY category
ORDER BY product_count DESC;
