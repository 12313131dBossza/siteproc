-- Test script to check if API is working
-- Run this to debug the deliveries API issue

-- First, let's see what data exists in our tables
SELECT 'Current data in tables:' as status;

-- Check if we have any orders
SELECT 'Orders:' as table_name, COUNT(*) as count
FROM orders;

-- Check if we have any deliveries
SELECT 'Deliveries:' as table_name, COUNT(*) as count
FROM deliveries;

-- Check if we have any order_items
SELECT 'Order Items:' as table_name, COUNT(*) as count
FROM order_items;

-- Show sample orders data
SELECT 'Sample Orders:' as info;
SELECT id, status, created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Show companies for reference
SELECT 'Companies:' as info;
SELECT id, name
FROM companies
ORDER BY created_at
LIMIT 5;
