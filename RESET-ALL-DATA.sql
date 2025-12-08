-- DANGER: This will DELETE ALL COMPANY DATA
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily for cleanup
SET session_replication_role = 'replica';

-- Delete in order of dependencies (child tables first)

-- Activity & Notifications
DELETE FROM activity_logs;
DELETE FROM notifications;

-- Project related
DELETE FROM project_messages;
DELETE FROM project_photos;
DELETE FROM project_milestones;
DELETE FROM project_members;

-- Financial documents
DELETE FROM change_order_items;
DELETE FROM change_orders;
DELETE FROM bid_items;
DELETE FROM bids;
DELETE FROM delivery_items;
DELETE FROM deliveries;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM purchase_orders;
DELETE FROM expenses;
DELETE FROM payments;

-- Inventory
DELETE FROM inventory_alerts;
DELETE FROM inventory_transactions;
DELETE FROM products;

-- Documents
DELETE FROM documents;

-- Contacts
DELETE FROM clients;
DELETE FROM contractors;
DELETE FROM suppliers;

-- Projects (after all project-related data)
DELETE FROM projects;

-- User & Company data
DELETE FROM invitations;
DELETE FROM profiles;
DELETE FROM companies;

-- Integrations
DELETE FROM integrations;
DELETE FROM quickbooks_connections;

-- Re-enable RLS
SET session_replication_role = 'origin';

-- Verify everything is deleted
SELECT 'companies' as table_name, COUNT(*) as remaining FROM companies
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses;
