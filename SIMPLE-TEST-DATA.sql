-- 🚀 SIMPLE TEST DATA CREATION
-- Run each section separately to see what works

-- ==============================================
-- SECTION 1: Create the project
-- ==============================================
INSERT INTO projects (
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
  'Downtown Office Building',
  'PROJ-2025-001',
  150000.00,
  'active',
  'e39d2f43-c0b7-4d87-bc88-9979448447c8',
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  NOW(),
  NOW()
);

-- Verify project
SELECT 
  'Project created:' as status,
  id,
  name,
  code
FROM projects
WHERE code = 'PROJ-2025-001';

-- ==============================================
-- SECTION 2: Create Order 1 - Cement
-- ==============================================
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
  id,
  250.00,
  'Portland Cement Type I - 50kg bags',
  'Building Materials',
  'ABC Building Supplies',
  'Portland Cement',
  20,
  12.50,
  'approved',
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  20
FROM projects
WHERE code = 'PROJ-2025-001';

-- ==============================================
-- SECTION 3: Create Order 2 - Rebar
-- ==============================================
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
  id,
  1500.00,
  'Steel Rebar 12mm x 12m',
  'Structural Materials',
  'Steel Masters Inc',
  'Rebar 12mm',
  100,
  15.00,
  'approved',
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  100
FROM projects
WHERE code = 'PROJ-2025-001';

-- ==============================================
-- SECTION 4: Create Order 3 - Sand
-- ==============================================
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
  id,
  450.00,
  'Fine Sand for concrete mix',
  'Aggregates',
  'Quarry Direct',
  'Fine Sand',
  15,
  30.00,
  'approved',
  'f34e5416-505a-42b3-a9af-74330c91e05b',
  15
FROM projects
WHERE code = 'PROJ-2025-001';

-- ==============================================
-- FINAL VERIFICATION
-- ==============================================
SELECT 
  '✅ FINAL COUNT' as section,
  COUNT(*) as total_orders
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
WHERE p.code = 'PROJ-2025-001';

SELECT 
  '✅ ALL ORDERS' as section,
  po.description,
  po.vendor,
  po.amount,
  po.status
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
WHERE p.code = 'PROJ-2025-001'
ORDER BY po.created_at;
