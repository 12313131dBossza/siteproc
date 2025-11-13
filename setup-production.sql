-- COMPLETE SETUP SQL FOR PRODUCTION DATABASE
-- Run this in Supabase SQL Editor for gjstirrsnkqxsbolsufn project

-- Step 1: Create TestCo company and get the ID
DO $$
DECLARE
  company_id_var UUID;
  user_id_var UUID;
  project1_id UUID;
  project2_id UUID;
  project3_id UUID;
BEGIN
  -- Create or get TestCo company
  INSERT INTO companies (name) 
  VALUES ('TestCo') 
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO company_id_var FROM companies WHERE name = 'TestCo';
  RAISE NOTICE 'Company ID: %', company_id_var;
  
  -- Get user ID (assumes user already signed up)
  SELECT id INTO user_id_var FROM auth.users WHERE email = 'chayaponyaibandit@gmail.com';
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User not found! Please sign up first at the production website.';
  END IF;
  
  RAISE NOTICE 'User ID: %', user_id_var;
  
  -- Create/update profile
  INSERT INTO profiles (id, email, company_id, role, username)
  VALUES (user_id_var, 'chayaponyaibandit@gmail.com', company_id_var, 'admin', 'chayaponyaibandit')
  ON CONFLICT (id) DO UPDATE 
  SET company_id = EXCLUDED.company_id, role = EXCLUDED.role;
  
  RAISE NOTICE 'Profile created/updated';
  
  -- Create projects
  INSERT INTO projects (company_id, created_by, code, name, budget, status)
  VALUES
    (company_id_var, user_id_var, 'PROD-DOR-001', 'Downtown Office Renovation', 150000, 'active');
  
  INSERT INTO projects (company_id, created_by, code, name, budget, status)
  VALUES
    (company_id_var, user_id_var, 'PROD-RES-002', 'Residential Complex - Phase 1', 500000, 'active');
  
  INSERT INTO projects (company_id, created_by, code, name, budget, status)
  VALUES
    (company_id_var, user_id_var, 'PROD-SML-003', 'Shopping Mall Expansion', 2000000, 'active');
  
  -- Get project IDs
  SELECT id INTO project1_id FROM projects WHERE code = 'PROD-DOR-001' AND company_id = company_id_var;
  SELECT id INTO project2_id FROM projects WHERE code = 'PROD-RES-002' AND company_id = company_id_var;
  SELECT id INTO project3_id FROM projects WHERE code = 'PROD-SML-003' AND company_id = company_id_var;
  
  RAISE NOTICE 'Projects created';
  
  -- Create expenses
  INSERT INTO expenses (company_id, project_id, user_id, vendor, category, amount, description, status, spent_at)
  VALUES
    (company_id_var, project1_id, user_id_var, 'ABC Construction', 'labor', 25500, 'Labor Week 1-2', 'approved', '2024-11-02'),
    (company_id_var, project1_id, user_id_var, 'BuildMart', 'materials', 8750, 'Cement', 'approved', '2024-11-06'),
    (company_id_var, project2_id, user_id_var, 'Metro Steel', 'materials', 46000, 'Steel rebar', 'approved', '2024-11-11'),
    (company_id_var, project1_id, user_id_var, 'Home Depot', 'materials', 3350, 'Paint', 'approved', '2024-11-16'),
    (company_id_var, project2_id, user_id_var, 'United Rentals', 'equipment', 4650, 'Excavator', 'approved', '2024-11-19'),
    (company_id_var, project1_id, user_id_var, 'United Rentals Equipment', 'equipment', 2900, 'Scaffolding', 'approved', '2024-11-21'),
    (company_id_var, project2_id, user_id_var, 'FastFreight', 'transportation', 1350, 'Delivery', 'approved', '2024-11-23'),
    (company_id_var, project1_id, user_id_var, 'Office Supplies', 'office', 475, 'Office supplies', 'pending', '2024-11-26'),
    (company_id_var, project2_id, user_id_var, 'PowerPro Electric', 'materials', 13000, 'Electrical', 'pending', '2024-11-29'),
    (company_id_var, project3_id, user_id_var, 'Design Architects', 'professional services', 15500, 'Architecture', 'pending', '2024-12-02');
  
  RAISE NOTICE 'Expenses created';
  
  -- Create payments
  INSERT INTO payments (company_id, project_id, vendor_name, amount, payment_date, payment_method, status)
  VALUES
    (company_id_var, project1_id, 'ABC Construction', 16000, '2024-11-05', 'Bank Transfer', 'paid'),
    (company_id_var, project2_id, 'Metro Steel', 51000, '2024-11-15', 'Check', 'paid'),
    (company_id_var, project1_id, 'BuildMart', 9000, '2024-11-20', 'Wire Transfer', 'paid'),
    (company_id_var, project2_id, 'United Rentals', 26000, '2024-12-01', 'Bank Transfer', 'unpaid'),
    (company_id_var, project3_id, 'Design Architects', 16000, '2024-12-05', 'Check', 'unpaid');
  
  RAISE NOTICE 'Payments created';
  
  RAISE NOTICE '✅ COMPLETE! Setup finished successfully!';
  RAISE NOTICE 'Company: TestCo (%), User: chayaponyaibandit@gmail.com', company_id_var;
  RAISE NOTICE '3 Projects, 10 Expenses, 5 Payments created';
  RAISE NOTICE 'Total Budget: $2,650,000';
END $$;

-- Verify the data was created
SELECT 
  'Projects' as type, 
  COUNT(*)::text as count,
  '$' || SUM(budget)::text as total
FROM projects 
WHERE company_id = (SELECT id FROM companies WHERE name = 'TestCo' LIMIT 1)
UNION ALL
SELECT 
  'Expenses' as type, 
  COUNT(*)::text as count,
  '$' || SUM(amount)::text as total
FROM expenses 
WHERE company_id = (SELECT id FROM companies WHERE name = 'TestCo' LIMIT 1)
UNION ALL
SELECT 
  'Payments' as type, 
  COUNT(*)::text as count,
  '$' || SUM(amount)::text as total
FROM payments 
WHERE company_id = (SELECT id FROM companies WHERE name = 'TestCo' LIMIT 1);
