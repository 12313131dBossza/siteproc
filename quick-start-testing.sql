-- 🚀 COMPLETE DATA DISCOVERY - Based on your actual schema
-- Run this to see all your test data

-- 1. Check if tables exist and get basic counts
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'expenses' as table_name, COUNT(*) as count FROM expenses  
UNION ALL
SELECT 'deliveries' as table_name, COUNT(*) as count FROM deliveries
UNION ALL
SELECT 'projects' as table_name, COUNT(*) as count FROM projects;

-- 2. Get orders with key columns for testing
SELECT id, status, project_id, created_at
FROM orders 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Get expenses with key columns for testing
SELECT id, amount, status, project_id, created_at
FROM expenses 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Get deliveries with key columns for testing
SELECT id, status, project_id, created_at
FROM deliveries 
ORDER BY created_at DESC
LIMIT 10;

-- 5. Get your project for testing (we found this one!)
SELECT id, name, budget, status, company_id
FROM projects 
WHERE id = '96abb85f-5920-4ce9-9966-90411a660aac';

-- 6. If you need MORE test data, uncomment and run:
/*
-- Create test orders (modify based on actual columns)
INSERT INTO orders (status, company_id) VALUES 
('pending', '162e7ccf-29fa-4511-b0d3-93c8347ead33'),
('pending', '162e7ccf-29fa-4511-b0d3-93c8347ead33'),
('pending', '162e7ccf-29fa-4511-b0d3-93c8347ead33');

-- Create test expenses  
INSERT INTO expenses (amount, status, company_id) VALUES 
(100.00, 'approved', '162e7ccf-29fa-4511-b0d3-93c8347ead33'),
(250.50, 'approved', '162e7ccf-29fa-4511-b0d3-93c8347ead33'),
(75.25, 'pending', '162e7ccf-29fa-4511-b0d3-93c8347ead33');

-- Create test deliveries
INSERT INTO deliveries (status, company_id) VALUES 
('pending', '162e7ccf-29fa-4511-b0d3-93c8347ead33'),
('pending', '162e7ccf-29fa-4511-b0d3-93c8347ead33');
*/
