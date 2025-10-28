-- ============================================================================
-- PHASE 5: EXPENSES MODULE ENHANCEMENTS
-- Based on verification results:
-- - 21 of 22 expenses missing receipts
-- - 1 expense awaiting approval
-- - 15 expenses not linked to projects
-- ============================================================================

-- Step 1: Add helpful indexes for expense queries (if not exist)
CREATE INDEX IF NOT EXISTS idx_expenses_status_created 
  ON expenses(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_vendor 
  ON expenses(vendor);

CREATE INDEX IF NOT EXISTS idx_expenses_category_amount 
  ON expenses(category, amount DESC);

-- Step 2: Create view for expense dashboard metrics
CREATE OR REPLACE VIEW expense_dashboard_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE receipt_url IS NULL) as missing_receipts,
  COUNT(*) FILTER (WHERE project_id IS NULL) as unlinked_expenses,
  SUM(amount) FILTER (WHERE status = 'approved') as approved_total,
  SUM(amount) FILTER (WHERE status = 'pending') as pending_total,
  ROUND(AVG(amount), 2) as avg_expense_amount,
  COUNT(*) as total_expenses
FROM expenses;

-- Step 3: Create view for project expense summary
CREATE OR REPLACE VIEW project_expense_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.code as project_code,
  p.budget,
  p.actual_cost,
  p.variance,
  COUNT(e.id) as expense_count,
  COUNT(e.id) FILTER (WHERE e.status = 'pending') as pending_expenses,
  COUNT(e.id) FILTER (WHERE e.status = 'approved') as approved_expenses,
  COUNT(e.id) FILTER (WHERE e.receipt_url IS NULL) as missing_receipts,
  COALESCE(SUM(e.amount), 0) as total_expense_amount,
  COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) as approved_expense_amount,
  CASE 
    WHEN p.variance < 0 THEN 'over_budget'
    WHEN p.variance < (p.budget * 0.2) THEN 'warning'
    ELSE 'on_track'
  END as budget_status
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id
GROUP BY p.id, p.name, p.code, p.budget, p.actual_cost, p.variance;

-- Step 4: Add function to check if expense needs attention
CREATE OR REPLACE FUNCTION expense_needs_attention(expense_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{"needs_attention": false, "reasons": []}'::JSONB;
  expense_record RECORD;
  reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO expense_record FROM expenses WHERE id = expense_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Expense not found"}'::JSONB;
  END IF;
  
  -- Check for missing receipt
  IF expense_record.receipt_url IS NULL AND expense_record.amount > 100 THEN
    reasons := array_append(reasons, 'Missing receipt (amount > $100)');
  END IF;
  
  -- Check for missing project linkage
  IF expense_record.project_id IS NULL THEN
    reasons := array_append(reasons, 'Not linked to project');
  END IF;
  
  -- Check for pending approval
  IF expense_record.status = 'pending' THEN
    reasons := array_append(reasons, 'Awaiting approval');
  END IF;
  
  -- Check if old pending expense
  IF expense_record.status = 'pending' AND expense_record.created_at < NOW() - INTERVAL '7 days' THEN
    reasons := array_append(reasons, 'Pending for over 7 days');
  END IF;
  
  -- Build result
  IF array_length(reasons, 1) > 0 THEN
    result := jsonb_build_object(
      'needs_attention', true,
      'reasons', to_jsonb(reasons),
      'expense_id', expense_id,
      'status', expense_record.status,
      'amount', expense_record.amount
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to get expenses needing attention
CREATE OR REPLACE FUNCTION get_expenses_needing_attention(company_uuid UUID)
RETURNS TABLE(
  expense_id UUID,
  vendor TEXT,
  amount NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  attention_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.vendor,
    e.amount,
    e.status,
    e.created_at,
    ARRAY(
      SELECT reason FROM (
        SELECT 'Missing receipt' as reason WHERE e.receipt_url IS NULL AND e.amount > 100
        UNION ALL
        SELECT 'Not linked to project' WHERE e.project_id IS NULL
        UNION ALL
        SELECT 'Awaiting approval' WHERE e.status = 'pending'
        UNION ALL
        SELECT 'Pending > 7 days' WHERE e.status = 'pending' AND e.created_at < NOW() - INTERVAL '7 days'
      ) reasons
    ) as attention_reasons
  FROM expenses e
  WHERE e.company_id = company_uuid
    AND (
      (e.receipt_url IS NULL AND e.amount > 100) OR
      e.project_id IS NULL OR
      e.status = 'pending'
    )
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add notification trigger for expenses needing approval
CREATE OR REPLACE FUNCTION notify_pending_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on INSERT of pending expense or UPDATE to pending
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'pending' AND NEW.status = 'pending') THEN
    
    -- Notify via pg_notify for real-time updates
    PERFORM pg_notify(
      'expense_pending',
      json_build_object(
        'expense_id', NEW.id,
        'vendor', NEW.vendor,
        'amount', NEW.amount,
        'company_id', NEW.company_id
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_pending_expense ON expenses;
CREATE TRIGGER trigger_notify_pending_expense
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_expense();

-- Step 7: Add helpful comments to table
COMMENT ON TABLE expenses IS 'Tracks all company expenses with approval workflow and project linking';
COMMENT ON COLUMN expenses.receipt_url IS 'URL to uploaded receipt image/PDF - recommended for expenses > $100';
COMMENT ON COLUMN expenses.project_id IS 'Links expense to project for budget tracking - triggers project actual_cost update';
COMMENT ON COLUMN expenses.status IS 'Approval status: pending (awaiting approval), approved (included in budgets), rejected (not counted)';
COMMENT ON COLUMN expenses.approved_by IS 'User ID who approved/rejected the expense';
COMMENT ON COLUMN expenses.approved_at IS 'Timestamp when expense was approved/rejected';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test expense dashboard metrics view
SELECT * FROM expense_dashboard_metrics;

-- Test project expense summary view
SELECT * FROM project_expense_summary
ORDER BY pending_expenses DESC, missing_receipts DESC
LIMIT 10;

-- Test expenses needing attention function
SELECT * FROM get_expenses_needing_attention(
  (SELECT company_id FROM expenses LIMIT 1)
);

-- Show indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'expenses'
  AND schemaname = 'public'
ORDER BY indexname;

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT 
  '=== PHASE 5 ENHANCEMENT SUMMARY ===' as section;

SELECT 
  'Indexes Added' as enhancement,
  COUNT(*) as count
FROM pg_indexes
WHERE tablename = 'expenses'
  AND schemaname = 'public'
  AND indexname LIKE 'idx_expenses_%';

SELECT 
  'Views Created' as enhancement,
  2 as count;

SELECT 
  'Helper Functions Created' as enhancement,
  2 as count;

SELECT 
  'Triggers Added' as enhancement,
  1 as count;

-- Show current state
SELECT 
  '=== CURRENT EXPENSE STATE ===' as section;

SELECT * FROM expense_dashboard_metrics;

