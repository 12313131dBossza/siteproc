-- ============================================================================
-- PHASE 6: PAYMENTS MODULE ENHANCEMENTS
-- Add missing columns, improve workflow, and enhance tracking
-- ============================================================================

-- Step 1: Add proof/receipt URL column for payment documentation
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

COMMENT ON COLUMN payments.proof_url IS 'URL to uploaded payment receipt, invoice, or proof of payment';

-- Step 2: Add notes column for payment details
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN payments.notes IS 'Additional notes or details about the payment';

-- Step 3: Ensure all core tracking columns exist
DO $$
BEGIN
  -- Add approved_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE payments ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add approved_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 4: Create view for payment dashboard metrics
CREATE OR REPLACE VIEW payment_dashboard_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  COUNT(*) FILTER (WHERE proof_url IS NULL) as missing_proof,
  COUNT(*) FILTER (WHERE project_id IS NULL AND order_id IS NULL AND expense_id IS NULL) as unlinked_payments,
  SUM(amount) FILTER (WHERE status = 'paid') as paid_total,
  SUM(amount) FILTER (WHERE status = 'unpaid') as unpaid_total,
  SUM(amount) FILTER (WHERE status = 'pending') as pending_total,
  ROUND(AVG(amount), 2) as avg_payment_amount,
  COUNT(*) as total_payments
FROM payments;

-- Step 5: Create view for project payment summary
CREATE OR REPLACE VIEW project_payment_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.code as project_code,
  p.budget,
  COUNT(pm.id) as payment_count,
  COUNT(pm.id) FILTER (WHERE pm.status = 'unpaid') as unpaid_payments,
  COUNT(pm.id) FILTER (WHERE pm.status = 'paid') as paid_payments,
  COUNT(pm.id) FILTER (WHERE pm.proof_url IS NULL) as missing_proof,
  COALESCE(SUM(pm.amount), 0) as total_payment_amount,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'paid'), 0) as paid_amount,
  COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'unpaid'), 0) as unpaid_amount,
  CASE 
    WHEN COUNT(pm.id) FILTER (WHERE pm.status = 'unpaid') > 0 THEN 'has_unpaid'
    WHEN COUNT(pm.id) = 0 THEN 'no_payments'
    ELSE 'all_paid'
  END as payment_status
FROM projects p
LEFT JOIN payments pm ON pm.project_id = p.id
GROUP BY p.id, p.name, p.code, p.budget;

-- Step 6: Create function to check if payment needs attention
CREATE OR REPLACE FUNCTION payment_needs_attention(payment_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{"needs_attention": false, "reasons": []}'::JSONB;
  payment_record RECORD;
  reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO payment_record FROM payments WHERE id = payment_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Payment not found"}'::JSONB;
  END IF;
  
  -- Check for missing proof for large payments
  IF payment_record.proof_url IS NULL AND payment_record.amount > 500 THEN
    reasons := array_append(reasons, 'Missing proof document (amount > $500)');
  END IF;
  
  -- Check for missing linkage
  IF payment_record.project_id IS NULL AND payment_record.order_id IS NULL AND payment_record.expense_id IS NULL THEN
    reasons := array_append(reasons, 'Not linked to project, order, or expense');
  END IF;
  
  -- Check for unpaid status
  IF payment_record.status = 'unpaid' THEN
    reasons := array_append(reasons, 'Payment not yet made');
  END IF;
  
  -- Check if old unpaid payment
  IF payment_record.status = 'unpaid' AND payment_record.payment_date < CURRENT_DATE - INTERVAL '30 days' THEN
    reasons := array_append(reasons, 'Overdue by more than 30 days');
  END IF;
  
  -- Check for missing reference number
  IF payment_record.reference_number IS NULL AND payment_record.status = 'paid' THEN
    reasons := array_append(reasons, 'Paid but missing reference number');
  END IF;
  
  -- Build result
  IF array_length(reasons, 1) > 0 THEN
    result := jsonb_build_object(
      'needs_attention', true,
      'reasons', to_jsonb(reasons),
      'payment_id', payment_id,
      'status', payment_record.status,
      'amount', payment_record.amount
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to get payments needing attention
CREATE OR REPLACE FUNCTION get_payments_needing_attention(company_uuid UUID)
RETURNS TABLE(
  payment_id UUID,
  vendor_name TEXT,
  amount NUMERIC,
  status TEXT,
  payment_date DATE,
  attention_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.vendor_name,
    pm.amount,
    pm.status,
    pm.payment_date,
    ARRAY(
      SELECT reason FROM (
        SELECT 'Missing proof document' as reason WHERE pm.proof_url IS NULL AND pm.amount > 500
        UNION ALL
        SELECT 'Not linked to project/order/expense' WHERE pm.project_id IS NULL AND pm.order_id IS NULL AND pm.expense_id IS NULL
        UNION ALL
        SELECT 'Payment not yet made' WHERE pm.status = 'unpaid'
        UNION ALL
        SELECT 'Overdue > 30 days' WHERE pm.status = 'unpaid' AND pm.payment_date < CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT 'Missing reference number' WHERE pm.reference_number IS NULL AND pm.status = 'paid'
      ) reasons
    ) as attention_reasons
  FROM payments pm
  WHERE pm.company_id = company_uuid
    AND (
      (pm.proof_url IS NULL AND pm.amount > 500) OR
      (pm.project_id IS NULL AND pm.order_id IS NULL AND pm.expense_id IS NULL) OR
      pm.status = 'unpaid' OR
      (pm.reference_number IS NULL AND pm.status = 'paid')
    )
  ORDER BY pm.payment_date ASC, pm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add notification trigger for overdue payments
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify on status change to paid
  IF (TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid') THEN
    PERFORM pg_notify(
      'payment_paid',
      json_build_object(
        'payment_id', NEW.id,
        'vendor_name', NEW.vendor_name,
        'amount', NEW.amount,
        'company_id', NEW.company_id,
        'project_id', NEW.project_id
      )::text
    );
  END IF;
  
  -- Notify on new unpaid payment
  IF (TG_OP = 'INSERT' AND NEW.status = 'unpaid') THEN
    PERFORM pg_notify(
      'payment_created',
      json_build_object(
        'payment_id', NEW.id,
        'vendor_name', NEW.vendor_name,
        'amount', NEW.amount,
        'payment_date', NEW.payment_date,
        'company_id', NEW.company_id
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_payment_status ON payments;
CREATE TRIGGER trigger_notify_payment_status
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();

-- Step 9: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_payments_status_date 
  ON payments(status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_vendor 
  ON payments(vendor_name);

CREATE INDEX IF NOT EXISTS idx_payments_amount 
  ON payments(amount DESC);

-- Step 10: Add helpful comments
COMMENT ON TABLE payments IS 'Tracks all company payments with approval workflow and linkage to projects/orders/expenses';
COMMENT ON COLUMN payments.status IS 'Payment status: unpaid (not yet paid), pending (processing), paid (completed), cancelled, failed';
COMMENT ON COLUMN payments.approved_by IS 'User ID who approved the payment';
COMMENT ON COLUMN payments.approved_at IS 'Timestamp when payment was approved';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test payment dashboard metrics view
SELECT '=== DASHBOARD METRICS ===' as section;
SELECT * FROM payment_dashboard_metrics;

-- Test project payment summary view
SELECT '=== PROJECT PAYMENT SUMMARY ===' as section;
SELECT * FROM project_payment_summary
WHERE payment_count > 0
ORDER BY unpaid_amount DESC, total_payment_amount DESC
LIMIT 10;

-- Show indexes
SELECT '=== PAYMENT INDEXES ===' as section;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payments'
  AND schemaname = 'public'
ORDER BY indexname;

-- Show new columns
SELECT '=== NEW COLUMNS ===' as section;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('proof_url', 'notes', 'approved_by', 'approved_at')
ORDER BY column_name;

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT '=== PHASE 6 ENHANCEMENT SUMMARY ===' as section;

SELECT 
  'New Columns Added' as enhancement,
  2 as count,
  'proof_url, notes' as details
UNION ALL
SELECT 
  'Views Created' as enhancement,
  2 as count,
  'payment_dashboard_metrics, project_payment_summary' as details
UNION ALL
SELECT 
  'Helper Functions Created' as enhancement,
  2 as count,
  'payment_needs_attention, get_payments_needing_attention' as details
UNION ALL
SELECT 
  'Triggers Added' as enhancement,
  1 as count,
  'trigger_notify_payment_status' as details
UNION ALL
SELECT 
  'Indexes Added' as enhancement,
  3 as count,
  'status_date, vendor, amount' as details;

-- Show current state
SELECT '=== CURRENT PAYMENT STATE ===' as section;
SELECT * FROM payment_dashboard_metrics;

SELECT '✅ Phase 6 Enhancements Complete!' as status;
