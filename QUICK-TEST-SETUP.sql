-- 🚀 QUICK TEST SETUP
-- Run this to create test project and order so you can test deliveries
-- For user: yaibondiseiei@gmail.com

-- ==============================================
-- STEP 1: Verify your setup
-- ==============================================

SELECT 
  '=== YOUR PROFILE ===' as section,
  id,
  email,
  full_name,
  company_id,
  role
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com';

-- ==============================================
-- STEP 2: Create company if missing
-- ==============================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_has_company BOOLEAN;
BEGIN
  -- Get user ID
  SELECT id, (company_id IS NOT NULL)
  INTO v_user_id, v_has_company
  FROM profiles
  WHERE email = 'yaibondiseiei@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User yaibondiseiei@gmail.com not found!';
  END IF;
  
  IF NOT v_has_company THEN
    -- Create company
    INSERT INTO companies (name, created_at)
    VALUES ('My Construction Company', NOW())
    RETURNING id INTO v_company_id;
    
    -- Update user profile
    UPDATE profiles
    SET company_id = v_company_id,
        role = 'owner'
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Created company: %', v_company_id;
  ELSE
    RAISE NOTICE '✅ Company already exists';
  END IF;
END $$;

-- ==============================================
-- STEP 3: Create test project
-- ==============================================

INSERT INTO projects (
  name,
  code,
  budget,
  status,
  company_id,
  created_by
)
SELECT 
  'Downtown Office Building',
  'PROJ-2025-001',
  150000.00,
  'active',
  company_id,
  id
FROM profiles
WHERE email = 'yaibondiseiei@gmail.com'
ON CONFLICT DO NOTHING;

-- ==============================================
-- STEP 4: Create test purchase orders
-- ==============================================

-- Order 1: Cement
INSERT INTO purchase_orders (
  project_id,
  amount,
  description,
  category,
  vendor,
  product_name,
  quantity,
  unit_price,
  status,
  requested_by,
  ordered_qty
)
SELECT 
  p.id,
  250.00,
  'Portland Cement Type I - 50kg bags',
  'Building Materials',
  'ABC Building Supplies',
  'Portland Cement',
  20,
  12.50,
  'approved',
  prof.id,
  20
FROM projects p
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE p.code = 'PROJ-2025-001'
  AND prof.email = 'yaibondiseiei@gmail.com'
ON CONFLICT DO NOTHING;

-- Order 2: Steel Rebar
INSERT INTO purchase_orders (
  project_id,
  amount,
  description,
  category,
  vendor,
  product_name,
  quantity,
  unit_price,
  status,
  requested_by,
  ordered_qty
)
SELECT 
  p.id,
  1500.00,
  'Steel Rebar 12mm x 12m',
  'Structural Materials',
  'Steel Masters Inc',
  'Rebar 12mm',
  100,
  15.00,
  'approved',
  prof.id,
  100
FROM projects p
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE p.code = 'PROJ-2025-001'
  AND prof.email = 'yaibondiseiei@gmail.com'
ON CONFLICT DO NOTHING;

-- Order 3: Sand
INSERT INTO purchase_orders (
  project_id,
  amount,
  description,
  category,
  vendor,
  product_name,
  quantity,
  unit_price,
  status,
  requested_by,
  ordered_qty
)
SELECT 
  p.id,
  450.00,
  'Fine Sand for concrete mix',
  'Aggregates',
  'Quarry Direct',
  'Fine Sand',
  15,
  30.00,
  'approved',
  prof.id,
  15
FROM projects p
INNER JOIN profiles prof ON prof.company_id = p.company_id
WHERE p.code = 'PROJ-2025-001'
  AND prof.email = 'yaibondiseiei@gmail.com'
ON CONFLICT DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

SELECT '🎉 TEST DATA SETUP COMPLETE!' as message;

-- Show company
SELECT 
  '=== YOUR COMPANY ===' as section,
  c.id,
  c.name,
  c.created_at
FROM companies c
INNER JOIN profiles p ON p.company_id = c.id
WHERE p.email = 'yaibondiseiei@gmail.com';

-- Show projects  
SELECT 
  '=== YOUR PROJECTS ===' as section,
  id,
  name,
  code,
  budget,
  status
FROM projects
WHERE code = 'PROJ-2025-001';

-- Show purchase orders
SELECT 
  '=== YOUR PURCHASE ORDERS ===' as section,
  po.id,
  po.description,
  po.vendor,
  po.product_name,
  po.quantity,
  po.unit_price,
  po.amount,
  po.status,
  p.name as project_name
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
WHERE p.code = 'PROJ-2025-001'
ORDER BY po.created_at;

SELECT 
  '✅ DONE! Refresh your deliveries page' as final_message,
  'Orders dropdown should now show 3 orders!' as expectation;
