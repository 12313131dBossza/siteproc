-- Simple data check - no complex functions
-- Run this to see what data exists

-- Check table counts
SELECT COUNT(*) as orders_count FROM orders;
SELECT COUNT(*) as deliveries_count FROM deliveries;
SELECT COUNT(*) as order_items_count FROM order_items;

-- Show any existing orders
SELECT * FROM orders LIMIT 3;

-- Show any existing deliveries  
SELECT * FROM deliveries LIMIT 3;

-- Show companies
SELECT * FROM companies LIMIT 5;
