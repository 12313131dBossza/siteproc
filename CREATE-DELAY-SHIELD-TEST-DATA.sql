-- ============================================================
-- DELAY SHIELD™ TEST DATA - High-Risk Demo Project
-- Run this in Supabase SQL Editor to create test data
-- ============================================================

-- First, get the Enterprise company ID (TUK based on your screenshot)
-- Run this first to find your company ID:
SELECT id, name, plan FROM companies WHERE plan = 'enterprise' LIMIT 5;

-- ============================================================
-- STEP 1: Create the test project
-- Replace 'YOUR_COMPANY_ID' with actual company ID from above
-- ============================================================

-- Create project with high budget to show big $ impact
INSERT INTO projects (
  id,
  company_id,
  name,
  project_number,
  status,
  budget,
  start_date,
  end_date,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM companies WHERE plan = 'enterprise' LIMIT 1), -- Auto-select enterprise company
  'Delay Shield Test Project',
  'DS-TEST-001',
  'active',
  500000,  -- $500k budget for big impact numbers
  CURRENT_DATE - INTERVAL '30 days',  -- Started 30 days ago
  CURRENT_DATE + INTERVAL '60 days',  -- Due in 60 days
  'Demo project to test Delay Shield AI predictions. Contains intentionally risky suppliers.',
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, budget;

-- Get the project ID we just created
-- (Run the SELECT below to get the ID for the next steps)
SELECT id, name, budget FROM projects WHERE name = 'Delay Shield Test Project';

-- ============================================================
-- STEP 2: Create Purchase Orders with risky delivery dates
-- Replace PROJECT_ID with the ID from above
-- ============================================================

-- Get project and company IDs for the inserts
DO $$
DECLARE
  v_project_id UUID;
  v_company_id UUID;
BEGIN
  -- Get the test project
  SELECT id, company_id INTO v_project_id, v_company_id 
  FROM projects 
  WHERE name = 'Delay Shield Test Project' 
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Test project not found. Creating it first...';
    
    -- Create the project if it doesn't exist
    INSERT INTO projects (
      company_id,
      name,
      project_number,
      status,
      budget,
      start_date,
      end_date,
      description
    ) 
    SELECT 
      id,
      'Delay Shield Test Project',
      'DS-TEST-001',
      'active',
      500000,
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE + INTERVAL '60 days',
      'Demo project for Delay Shield AI'
    FROM companies 
    WHERE plan = 'enterprise' 
    LIMIT 1
    RETURNING id, company_id INTO v_project_id, v_company_id;
  END IF;

  RAISE NOTICE 'Project ID: %, Company ID: %', v_project_id, v_company_id;

  -- Order 1: Concrete - delivery tomorrow (tight deadline)
  INSERT INTO purchase_orders (
    company_id,
    project_id,
    vendor,
    description,
    amount,
    status,
    requested_by,
    created_at
  ) VALUES (
    v_company_id,
    v_project_id,
    'Slow Concrete Co',
    'Concrete foundation materials - 200 cubic yards',
    45000,
    'pending',
    (SELECT id FROM profiles WHERE company_id = v_company_id LIMIT 1),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Order 2: Lumber - delivery in 3 days
  INSERT INTO purchase_orders (
    company_id,
    project_id,
    vendor,
    description,
    amount,
    status,
    requested_by,
    created_at
  ) VALUES (
    v_company_id,
    v_project_id,
    'Rainy Lumber Supply',
    'Framing lumber and structural wood',
    32000,
    'pending',
    (SELECT id FROM profiles WHERE company_id = v_company_id LIMIT 1),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Order 3: Windows - old order (simulates late supplier)
  INSERT INTO purchase_orders (
    company_id,
    project_id,
    vendor,
    description,
    amount,
    status,
    requested_by,
    created_at
  ) VALUES (
    v_company_id,
    v_project_id,
    'Always Late Windows Inc',
    'Custom double-pane windows - 24 units - DELAYED',
    28000,
    'pending',
    (SELECT id FROM profiles WHERE company_id = v_company_id LIMIT 1),
    NOW() - INTERVAL '10 days'  -- Created 10 days ago, still pending = late
  )
  ON CONFLICT DO NOTHING;

  -- Order 4: Another old pending order (simulates late supplier)
  INSERT INTO purchase_orders (
    company_id,
    project_id,
    vendor,
    description,
    amount,
    status,
    requested_by,
    created_at
  ) VALUES (
    v_company_id,
    v_project_id,
    'Delayed HVAC Systems',
    'Central heating and cooling unit - SEVERELY DELAYED',
    18000,
    'pending',
    (SELECT id FROM profiles WHERE company_id = v_company_id LIMIT 1),
    NOW() - INTERVAL '15 days'  -- Created 15 days ago, still pending = very late
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 4 purchase orders for project %', v_project_id;

END $$;

-- ============================================================
-- STEP 3: Add overdue milestones for extra risk
-- ============================================================

DO $$
DECLARE
  v_project_id UUID;
  v_company_id UUID;
BEGIN
  SELECT id, company_id INTO v_project_id, v_company_id 
  FROM projects 
  WHERE name = 'Delay Shield Test Project' 
  LIMIT 1;

  -- Overdue milestone 1
  INSERT INTO project_milestones (
    project_id,
    company_id,
    name,
    description,
    target_date,
    completed,
    created_at
  ) VALUES (
    v_project_id,
    v_company_id,
    'Foundation Complete',
    'Concrete foundation should be poured and cured',
    CURRENT_DATE - INTERVAL '3 days',  -- 3 days overdue
    false,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Overdue milestone 2
  INSERT INTO project_milestones (
    project_id,
    company_id,
    name,
    description,
    target_date,
    completed,
    created_at
  ) VALUES (
    v_project_id,
    v_company_id,
    'Framing Inspection',
    'City inspection of structural framing',
    CURRENT_DATE - INTERVAL '1 day',  -- 1 day overdue
    false,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created milestones for project %', v_project_id;

END $$;

-- ============================================================
-- STEP 4: Add expenses to show budget usage (90%+ triggers alert)
-- NOTE: This step is OPTIONAL - the late orders and milestones 
-- are enough to trigger HIGH risk alerts
-- ============================================================

-- Skip expenses for now - uncomment and adjust if your expenses table 
-- has different columns. The 2 late orders + 2 overdue milestones 
-- should trigger HIGH/CRITICAL risk anyway.

/*
DO $$
DECLARE
  v_project_id UUID;
  v_company_id UUID;
BEGIN
  SELECT id, company_id INTO v_project_id, v_company_id 
  FROM projects 
  WHERE name = 'Delay Shield Test Project' 
  LIMIT 1;

  -- Check your expenses table structure first:
  -- SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses';
  
  -- Then insert expenses with correct column names
  RAISE NOTICE 'Skipping expenses - adjust SQL if needed';

END $$;
*/

-- ============================================================
-- VERIFICATION - Check what we created
-- ============================================================

-- Check the project
SELECT 
  p.id,
  p.name,
  p.budget,
  p.status,
  c.name as company_name,
  c.plan
FROM projects p
JOIN companies c ON c.id = p.company_id
WHERE p.name = 'Delay Shield Test Project';

-- Check purchase orders (should show old pending orders = risky)
SELECT 
  id,
  vendor,
  amount,
  status,
  created_at,
  CASE 
    WHEN status = 'pending' AND created_at < NOW() - INTERVAL '7 days' THEN '🔴 OLD PENDING ORDER (risky)'
    WHEN status = 'pending' AND created_at < NOW() - INTERVAL '3 days' THEN '🟠 Pending > 3 days'
    WHEN status = 'pending' THEN '🟡 Pending'
    ELSE '🟢 ' || status
  END as risk_status
FROM purchase_orders
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test Project')
ORDER BY created_at;

-- Check milestones (should show overdue)
SELECT 
  name,
  target_date,
  completed,
  CASE 
    WHEN target_date < CURRENT_DATE AND completed = false THEN '🔴 OVERDUE'
    ELSE '🟢 OK'
  END as milestone_status
FROM project_milestones
WHERE project_id = (SELECT id FROM projects WHERE name = 'Delay Shield Test Project');

-- Check total expenses vs budget (optional - may fail if expenses table is different)
-- SELECT 
--   p.name,
--   p.budget,
--   COALESCE(SUM(e.amount), 0) as total_spent,
--   ROUND(COALESCE(SUM(e.amount), 0) / p.budget * 100, 1) as percent_used
-- FROM projects p
-- LEFT JOIN expenses e ON e.project_id = p.id
-- WHERE p.name = 'Delay Shield Test Project'
-- GROUP BY p.id, p.name, p.budget;

-- ============================================================
-- SUCCESS! Now go to Delay Shield page and click "Run Full Scan"
-- You should see:
-- - Risk Level: HIGH or CRITICAL
-- - Multiple contributing factors (late orders, overdue milestones, budget)
-- - Financial impact: $20k+ 
-- - 3 recovery options
-- ============================================================
