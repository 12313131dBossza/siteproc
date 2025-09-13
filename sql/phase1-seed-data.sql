-- Phase-1 Seed Data
-- Run this after the schema to create test data
-- Company: ACME, Users: alice (admin), bob (member), Project: Project A ($10,000)

-- Insert test company
INSERT INTO companies (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'ACME Construction')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Insert test users (you'll need to create these in Supabase Auth first)
-- alice@acme.com (admin) - id: '550e8400-e29b-41d4-a716-446655440001'
-- bob@acme.com (member) - id: '550e8400-e29b-41d4-a716-446655440002'

INSERT INTO profiles (id, company_id, role, full_name, email) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'admin', 'Alice Johnson', 'alice@acme.com'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'member', 'Bob Smith', 'bob@acme.com')
ON CONFLICT (id) DO UPDATE SET 
  company_id = EXCLUDED.company_id,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- Insert test project
INSERT INTO projects (id, company_id, name, budget, status) 
VALUES ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 'Project A', 10000.00, 'Active')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  budget = EXCLUDED.budget,
  status = EXCLUDED.status;

-- Insert some sample orders
INSERT INTO orders (id, company_id, project_id, sku, qty, unit_price, supplier, status, requested_by, decided_by, decided_at) VALUES
('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440000', NULL, 'STEEL-BEAM-001', 10, 150.00, 'Steel Suppliers Co.', 'requested', '550e8400-e29b-41d4-a716-446655440002', NULL, NULL),
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440100', 'CONCRETE-MIX-001', 50, 25.00, 'Concrete Solutions', 'approved', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', now() - interval '2 days')
ON CONFLICT (id) DO UPDATE SET 
  sku = EXCLUDED.sku,
  qty = EXCLUDED.qty,
  unit_price = EXCLUDED.unit_price,
  supplier = EXCLUDED.supplier,
  status = EXCLUDED.status;

-- Insert some sample expenses
INSERT INTO expenses (id, company_id, project_id, category, vendor, amount, status, submitted_by, decided_by, decided_at, spend_date) VALUES
('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440100', 'Labor', 'Construction Workers Inc.', 2500.00, 'approved', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', now() - interval '1 day', current_date - interval '1 day'),
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440000', NULL, 'Materials', 'Hardware Store', 150.00, 'pending', '550e8400-e29b-41d4-a716-446655440002', NULL, NULL, current_date)
ON CONFLICT (id) DO UPDATE SET 
  category = EXCLUDED.category,
  vendor = EXCLUDED.vendor,
  amount = EXCLUDED.amount,
  status = EXCLUDED.status;

-- Insert some sample deliveries
INSERT INTO deliveries (id, company_id, project_id, item, qty, supplier, status, logged_by, confirmed_by, confirmed_at, delivered_at) VALUES
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440000', NULL, 'Cement bags', 100, 'Cement Co.', 'pending', '550e8400-e29b-41d4-a716-446655440002', NULL, NULL, current_date),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440100', 'Steel beams', 20, 'Steel Works', 'received', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', now() - interval '3 hours', current_date - interval '1 day')
ON CONFLICT (id) DO UPDATE SET 
  item = EXCLUDED.item,
  qty = EXCLUDED.qty,
  supplier = EXCLUDED.supplier,
  status = EXCLUDED.status;

-- Insert some activity logs
INSERT INTO activity_logs (company_id, actor_id, entity_type, entity_id, action, meta) VALUES
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'order', '550e8400-e29b-41d4-a716-446655440200', 'requested', '{"sku": "STEEL-BEAM-001", "qty": 10, "supplier": "Steel Suppliers Co."}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'order', '550e8400-e29b-41d4-a716-446655440201', 'approved', '{"sku": "CONCRETE-MIX-001", "assigned_project": "Project A"}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'expense', '550e8400-e29b-41d4-a716-446655440300', 'submitted', '{"category": "Labor", "amount": 2500.00}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'expense', '550e8400-e29b-41d4-a716-446655440300', 'approved', '{"category": "Labor", "amount": 2500.00, "assigned_project": "Project A"}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'delivery', '550e8400-e29b-41d4-a716-446655440401', 'logged', '{"item": "Steel beams", "qty": 20}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'delivery', '550e8400-e29b-41d4-a716-446655440401', 'received', '{"item": "Steel beams", "qty": 20, "assigned_project": "Project A"}')
ON CONFLICT DO NOTHING;