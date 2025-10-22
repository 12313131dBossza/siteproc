-- 🚀 CREATE TEST DATA FOR PRODUCTION
-- Using your ACTUAL company_id from production

-- Your company: e39d2f43-c0b7-4d87-bc88-9979448447c8
-- Your profile: f34e5416-505a-42b3-a9af-74330c91e05b

-- Step 1: Create test project (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE code = 'PROJ-2025-001' 
    AND company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8'
  ) THEN
    INSERT INTO projects (
      id,
      name,
      code,
      budget,
      status,
      company_id,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'Downtown Office Building',
      'PROJ-2025-001',
      150000.00,
      'active',
      'e39d2f43-c0b7-4d87-bc88-9979448447c8',
      'f34e5416-505a-42b3-a9af-74330c91e05b',
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Created project: Downtown Office Building';
  ELSE
    RAISE NOTICE '✅ Project already exists';
  END IF;
END $$;

-- Verify project was created
SELECT 
  '=== PROJECT CREATED ===' as section,
  id,
  name,
  code,
  budget
FROM projects
WHERE code = 'PROJ-2025-001'
  AND company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

-- Step 2: Create purchase orders
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
  ordered_qty,
  created_at,
  updated_at
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
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  20,
  NOW(),
  NOW()
FROM projects p
WHERE p.code = 'PROJ-2025-001'
  AND p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

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
  ordered_qty,
  created_at,
  updated_at
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
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  100,
  NOW(),
  NOW()
FROM projects p
WHERE p.code = 'PROJ-2025-001'
  AND p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

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
  ordered_qty,
  created_at,
  updated_at
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
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  15,
  NOW(),
  NOW()
FROM projects p
WHERE p.code = 'PROJ-2025-001'
  AND p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

-- Order 4: Concrete Mix
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
  ordered_qty,
  created_at,
  updated_at
)
SELECT 
  p.id,
  2400.00,
  'Ready-Mix Concrete C30',
  'Concrete',
  'QuickMix Concrete Ltd',
  'Concrete C30',
  40,
  60.00,
  'approved',
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  40,
  NOW(),
  NOW()
FROM projects p
WHERE p.code = 'PROJ-2025-001'
  AND p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

-- Order 5: Bricks
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
  ordered_qty,
  created_at,
  updated_at
)
SELECT 
  p.id,
  3200.00,
  'Red Clay Bricks - Standard',
  'Masonry',
  'Brick Works Co',
  'Red Clay Bricks',
  1000,
  3.20,
  'approved',
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  1000,
  NOW(),
  NOW()
FROM projects p
WHERE p.code = 'PROJ-2025-001'
  AND p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

-- VERIFICATION
SELECT 
  '✅ VERIFICATION' as section,
  'Projects created: ' || COUNT(DISTINCT p.id)::text as projects,
  'Orders created: ' || COUNT(po.id)::text as orders
FROM projects p
LEFT JOIN purchase_orders po ON po.project_id = p.id
WHERE p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8';

-- Show the created data
SELECT 
  '=== CREATED ORDERS ===' as section,
  po.id,
  po.description,
  po.vendor,
  po.amount,
  po.status,
  p.name as project_name
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
WHERE p.company_id = 'e39d2f43-c0b7-4d87-bc88-9979448447c8'
ORDER BY po.created_at;

SELECT '🎉 DONE! Now refresh /api/test-db-connection and you should see 5 orders!' as message;
