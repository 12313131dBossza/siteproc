-- Make project_id nullable in purchase_orders table
-- Bids can be created without a project, so orders converted from bids can also have null project_id

ALTER TABLE purchase_orders
ALTER COLUMN project_id DROP NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
  AND column_name = 'project_id';

SELECT '✅ PROJECT_ID NOW NULLABLE IN PURCHASE_ORDERS!' as status;
