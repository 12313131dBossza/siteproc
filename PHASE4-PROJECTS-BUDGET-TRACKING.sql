-- ============================================================================
-- PHASE 4: PROJECTS BUDGET TRACKING MIGRATION
-- Add actual cost tracking, variance calculation, and auto-update triggers
-- ============================================================================

-- Step 1: Add budget tracking columns to projects table
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Set defaults for existing columns
UPDATE projects SET actual_cost = 0 WHERE actual_cost IS NULL;
UPDATE projects SET variance = 0 WHERE variance IS NULL;

-- Step 2: Create function to calculate actual cost from orders + expenses
CREATE OR REPLACE FUNCTION calculate_project_actual_cost(project_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_orders NUMERIC;
  total_expenses NUMERIC;
  total_cost NUMERIC;
BEGIN
  -- Sum delivered_value from all orders (POs) linked to this project
  SELECT COALESCE(SUM(delivered_value), 0)
  INTO total_orders
  FROM orders
  WHERE project_id = project_uuid;

  -- Sum amount from all expenses linked to this project
  SELECT COALESCE(SUM(amount), 0)
  INTO total_expenses
  FROM expenses
  WHERE project_id = project_uuid;

  -- Total actual cost
  total_cost := total_orders + total_expenses;

  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to update project costs
CREATE OR REPLACE FUNCTION update_project_costs()
RETURNS TRIGGER AS $$
DECLARE
  project_uuid UUID;
  new_actual_cost NUMERIC;
  project_budget NUMERIC;
  new_variance NUMERIC;
BEGIN
  -- Get project_id from the affected table
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'DELETE' THEN
      project_uuid := OLD.project_id;
    ELSE
      project_uuid := NEW.project_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    IF TG_OP = 'DELETE' THEN
      project_uuid := OLD.project_id;
    ELSE
      project_uuid := NEW.project_id;
    END IF;
  END IF;

  -- Skip if no project_id
  IF project_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate new actual cost
  new_actual_cost := calculate_project_actual_cost(project_uuid);

  -- Get project budget
  SELECT budget INTO project_budget
  FROM projects
  WHERE id = project_uuid;

  -- Calculate variance (budget - actual_cost)
  new_variance := project_budget - new_actual_cost;

  -- Update project
  UPDATE projects
  SET 
    actual_cost = new_actual_cost,
    variance = new_variance,
    updated_at = NOW()
  WHERE id = project_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add updated_at column if missing
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_update_project_cost_on_order ON orders;
CREATE TRIGGER trigger_update_project_cost_on_order
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_project_costs();

-- Step 6: Create trigger on expenses table
DROP TRIGGER IF EXISTS trigger_update_project_cost_on_expense ON expenses;
CREATE TRIGGER trigger_update_project_cost_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_costs();

-- Step 7: Backfill actual_cost for existing projects
DO $$
DECLARE
  project_record RECORD;
  calculated_cost NUMERIC;
BEGIN
  FOR project_record IN SELECT id FROM projects LOOP
    calculated_cost := calculate_project_actual_cost(project_record.id);
    
    UPDATE projects
    SET 
      actual_cost = calculated_cost,
      variance = budget - calculated_cost
    WHERE id = project_record.id;
  END LOOP;
END $$;

-- Step 8: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_project ON orders(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check new columns
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('actual_cost', 'variance', 'start_date', 'end_date', 'description')
ORDER BY ordinal_position;

-- Check sample project with budget tracking
SELECT 
  id,
  name,
  budget,
  actual_cost,
  variance,
  status
FROM projects
ORDER BY created_at DESC
LIMIT 5;

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%project_cost%';
