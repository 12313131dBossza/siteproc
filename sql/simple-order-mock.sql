-- 🔧 SIMPLE ORDER MOCK (Supabase SQL Editor compatible)
-- Creates a mock product (if needed) and a mock order linked to your latest project in your admin/owner company.
-- Run this whole script in Supabase SQL Editor (Role: postgres). No extensions or RPC required.

-- ============================================================================
-- SETTINGS (optional): Set your project override here (or leave NULL to auto-pick latest in your company)
-- ============================================================================
-- Example: set v_override := '96abb05f-5920-4ce9-9066-90411a660aac'::uuid;

-- Ensure there is at least one product with stock
INSERT INTO products (id, name, sku, price, stock, unit)
SELECT gen_random_uuid(), 'MOCK TEST PRODUCT', 'MOCK-SKU', 12.34, 100, 'unit'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE stock > 0);

DO $$
DECLARE
  v_override uuid := NULL; -- <-- Replace NULL with your project UUID to force-link, e.g. '00000000-0000-0000-0000-000000000000'::uuid
  v_user uuid;
  v_company uuid;
  v_project uuid;
  v_product uuid;
  v_order uuid;
BEGIN
  -- Pick an admin/owner for company scope
  SELECT id, company_id INTO v_user, v_company
  FROM profiles
  WHERE role IN ('admin','owner')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No admin/owner profile found in profiles table';
  END IF;

  -- Pick a project: override or latest active/on_hold (or NULL status) in same company
  IF v_override IS NOT NULL THEN
    v_project := v_override;
  ELSE
    SELECT p.id INTO v_project
    FROM projects p
    WHERE p.company_id = v_company
      AND (p.status IS NULL OR p.status IN ('active','on_hold'))
    ORDER BY p.created_at DESC
    LIMIT 1;
  END IF;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'No project found for your company; create a project or set v_override above';
  END IF;

  -- Pick a product with stock
  SELECT id INTO v_product
  FROM products
  WHERE stock > 0
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_product IS NULL THEN
    RAISE EXCEPTION 'No product available with stock';
  END IF;

  -- Try insert variants to handle schema drift
  BEGIN
    INSERT INTO orders (id, product_id, qty, status, note, created_by, project_id, company_id)
    VALUES (gen_random_uuid(), v_product, 1, 'pending', 'MOCK TEST ORDER', v_user, v_project, v_company)
    RETURNING id INTO v_order;
  EXCEPTION WHEN undefined_column THEN
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

  RAISE NOTICE 'MOCK ORDER CREATED: % (project %)', v_order, v_project;
END $$;

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
