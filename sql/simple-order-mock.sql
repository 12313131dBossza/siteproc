-- 🔧 SIMPLE ORDER MOCK
-- Creates a mock product (if needed) and a mock order linked to your latest project and admin company.
-- Run this in Supabase SQL editor or via the npm script added (see package.json).

-- ============================================================================
-- SETTINGS (optional): To target a specific project, replace NULL with your project UUID
-- ============================================================================
-- Example: SELECT 'override' AS k, '96abb05f-5920-4ce9-9066-90411a660aac'::uuid AS v
WITH override(project_id) AS (
  SELECT NULL::uuid
)
, admin_user AS (
  SELECT id, company_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at DESC
  LIMIT 1
)
, chosen_project AS (
  SELECT COALESCE(o.project_id,
                  (SELECT id FROM projects p
                   JOIN admin_user au ON au.company_id = p.company_id
                   WHERE p.status IS NULL OR p.status IN ('active','on_hold')
                   ORDER BY p.created_at DESC
                   LIMIT 1)) AS id
  FROM override o
)
, chosen_product AS (
  SELECT id
  FROM products
  WHERE stock > 0
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1
)
-- Insert a fallback product if none exists
INSERT INTO products (id, name, sku, price, stock, unit)
SELECT gen_random_uuid(), 'MOCK TEST PRODUCT', 'MOCK-SKU', 12.34, 100, 'unit'
WHERE NOT EXISTS (SELECT 1 FROM chosen_product);

-- Re-evaluate chosen product after potential insert
WITH admin_user AS (
  SELECT id, company_id FROM profiles WHERE role = 'admin' ORDER BY created_at DESC LIMIT 1
), chosen_project AS (
  SELECT id FROM (
    SELECT COALESCE((SELECT project_id FROM (VALUES (NULL::uuid)) v(project_id)), id) AS id
    FROM projects p
    JOIN admin_user au ON au.company_id = p.company_id
    WHERE p.status IS NULL OR p.status IN ('active','on_hold')
    ORDER BY p.created_at DESC
    LIMIT 1
  ) t
), product_pick AS (
  SELECT id FROM products WHERE stock > 0 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1
), ins AS (
  -- Try insert with created_by + optional company_id and project_id
  DO $$
  DECLARE
    v_product uuid;
    v_project uuid;
    v_user uuid;
    v_company uuid;
    v_order uuid;
  BEGIN
    SELECT id INTO v_product FROM product_pick;
    SELECT id INTO v_project FROM chosen_project;
    SELECT id, company_id INTO v_user, v_company FROM admin_user;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'No product available to create order';
    END IF;
    IF v_project IS NULL THEN
      RAISE EXCEPTION 'No project found in your company; create a project first or set override at top of file';
    END IF;

    BEGIN
      INSERT INTO orders (id, product_id, qty, status, note, created_by, project_id, company_id)
      VALUES (gen_random_uuid(), v_product, 1, 'pending', 'MOCK TEST ORDER', v_user, v_project, v_company)
      RETURNING id INTO v_order;
    EXCEPTION WHEN undefined_column THEN
      -- Retry variants as schema may differ
      BEGIN
        INSERT INTO orders (id, product_id, qty, status, note, created_by, project_id)
        VALUES (gen_random_uuid(), v_product, 1, 'pending', 'MOCK TEST ORDER', v_user, v_project)
        RETURNING id INTO v_order;
      EXCEPTION WHEN undefined_column THEN
        BEGIN
          INSERT INTO orders (id, product_id, qty, status, note, user_id, project_id)
          VALUES (gen_random_uuid(), v_product, 1, 'pending', 'MOCK TEST ORDER', v_user, v_project)
          RETURNING id INTO v_order;
        EXCEPTION WHEN undefined_column THEN
          INSERT INTO orders (id, product_id, qty, status, project_id)
          VALUES (gen_random_uuid(), v_product, 1, 'pending', v_project)
          RETURNING id INTO v_order;
        END;
      END;
    END;

    RAISE NOTICE 'MOCK ORDER CREATED: %', v_order;
  END $$
)
SELECT 'DONE' AS info;

-- ============================================================================
-- VERIFY
-- Shows the most recent MOCK order
-- ============================================================================
SELECT 'ORDER CHECK' AS info,
       o.id,
       o.status,
       o.project_id,
       o.company_id,
       o.created_at
FROM orders o
WHERE (o.note ILIKE '%MOCK TEST ORDER%' OR o.notes ILIKE '%MOCK TEST ORDER%')
ORDER BY o.created_at DESC
LIMIT 1;

-- To clean up the latest MOCK order:
-- DELETE FROM orders WHERE id = (
--   SELECT id FROM orders WHERE (note ILIKE '%MOCK TEST ORDER%' OR notes ILIKE '%MOCK TEST ORDER%') ORDER BY created_at DESC LIMIT 1
-- );
