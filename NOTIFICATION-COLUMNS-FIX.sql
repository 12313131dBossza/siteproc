-- NOTIFICATION-COLUMNS-FIX.sql
-- Purpose: Ensure all tables have required columns for notification system to work
-- Run this to fix expenses, payments, and deliveries notification dependencies

BEGIN;

-- ============================================================================
-- 1. EXPENSES TABLE - Add submitted_by column
-- ============================================================================
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  -- Add submitted_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='expenses' AND column_name='submitted_by'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN submitted_by uuid REFERENCES auth.users(id);
    RAISE NOTICE '✅ Added submitted_by column to expenses';
  ELSE
    RAISE NOTICE 'ℹ️ expenses.submitted_by already exists';
  END IF;
  
  -- Backfill submitted_by from user_id
  UPDATE public.expenses 
  SET submitted_by = user_id 
  WHERE submitted_by IS NULL AND user_id IS NOT NULL;
  
  -- Get count and report
  SELECT COUNT(*) INTO backfill_count FROM public.expenses WHERE submitted_by IS NOT NULL;
  RAISE NOTICE '✅ Backfilled submitted_by for % expenses', backfill_count;
END $$;

-- ============================================================================
-- 2. PAYMENTS TABLE - Verify created_by exists
-- ============================================================================
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  -- Add created_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payments' AND column_name='created_by'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN created_by uuid REFERENCES auth.users(id);
    RAISE NOTICE '✅ Added created_by column to payments';
  ELSE
    RAISE NOTICE 'ℹ️ payments.created_by already exists';
  END IF;
  
  -- Backfill created_by from first admin/owner in same company if null
  UPDATE public.payments p
  SET created_by = (
    SELECT pr.id 
    FROM public.profiles pr 
    WHERE pr.company_id = p.company_id 
      AND pr.role IN ('admin', 'owner', 'bookkeeper')
    ORDER BY pr.created_at ASC 
    LIMIT 1
  )
  WHERE p.created_by IS NULL AND p.company_id IS NOT NULL;
  
  -- Get count and report
  SELECT COUNT(*) INTO backfill_count FROM public.payments WHERE created_by IS NOT NULL;
  RAISE NOTICE '✅ Backfilled created_by for % payments', backfill_count;
END $$;

-- ============================================================================
-- 3. DELIVERIES TABLE - Verify order_id exists
-- ============================================================================
DO $$
BEGIN
  -- Add order_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='deliveries' AND column_name='order_id'
  ) THEN
    ALTER TABLE public.deliveries ADD COLUMN order_id uuid REFERENCES purchase_orders(id);
    RAISE NOTICE '✅ Added order_id column to deliveries';
  ELSE
    RAISE NOTICE 'ℹ️ deliveries.order_id already exists';
  END IF;
END $$;

-- ============================================================================
-- 4. PURCHASE_ORDERS TABLE - Verify created_by exists
-- ============================================================================
DO $$
BEGIN
  -- Add created_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='created_by'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN created_by uuid REFERENCES auth.users(id);
    RAISE NOTICE '✅ Added created_by column to purchase_orders';
  ELSE
    RAISE NOTICE 'ℹ️ purchase_orders.created_by already exists';
  END IF;
END $$;

-- ============================================================================
-- 5. Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON public.expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);

COMMIT;

-- ============================================================================
-- 6. Verification Report
-- ============================================================================
SELECT 
  '📊 NOTIFICATION COLUMNS VERIFICATION' as report_section,
  '' as blank_line;

-- Check expenses
SELECT 
  'EXPENSES' as table_name,
  COUNT(*) FILTER (WHERE column_name = 'submitted_by') as has_submitted_by,
  COUNT(*) FILTER (WHERE column_name = 'user_id') as has_user_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name = 'submitted_by') = 1 THEN '✅ READY'
    ELSE '❌ MISSING submitted_by'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'expenses'
  AND column_name IN ('submitted_by', 'user_id')
UNION ALL
-- Check payments
SELECT 
  'PAYMENTS' as table_name,
  COUNT(*) FILTER (WHERE column_name = 'created_by') as has_created_by,
  COUNT(*) FILTER (WHERE column_name = 'company_id') as has_company_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name = 'created_by') = 1 THEN '✅ READY'
    ELSE '❌ MISSING created_by'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'payments'
  AND column_name IN ('created_by', 'company_id')
UNION ALL
-- Check deliveries
SELECT 
  'DELIVERIES' as table_name,
  COUNT(*) FILTER (WHERE column_name = 'order_id') as has_order_id,
  COUNT(*) FILTER (WHERE column_name = 'company_id') as has_company_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name = 'order_id') = 1 THEN '✅ READY'
    ELSE '❌ MISSING order_id'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'deliveries'
  AND column_name IN ('order_id', 'company_id')
UNION ALL
-- Check purchase_orders
SELECT 
  'PURCHASE_ORDERS' as table_name,
  COUNT(*) FILTER (WHERE column_name = 'created_by') as has_created_by,
  COUNT(*) FILTER (WHERE column_name = 'company_id') as has_company_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name = 'created_by') = 1 THEN '✅ READY'
    ELSE '❌ MISSING created_by'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'purchase_orders'
  AND column_name IN ('created_by', 'company_id');

-- Check data coverage
SELECT 
  '📈 DATA COVERAGE' as report_section,
  '' as blank_line;

SELECT 
  'Expenses with submitted_by' as metric,
  COUNT(*) FILTER (WHERE submitted_by IS NOT NULL) as count,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE submitted_by IS NOT NULL) / NULLIF(COUNT(*), 0), 1) || '%' as percentage
FROM public.expenses
UNION ALL
SELECT 
  'Payments with created_by' as metric,
  COUNT(*) FILTER (WHERE created_by IS NOT NULL) as count,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE created_by IS NOT NULL) / NULLIF(COUNT(*), 0), 1) || '%' as percentage
FROM public.payments
UNION ALL
SELECT 
  'Deliveries with order_id' as metric,
  COUNT(*) FILTER (WHERE order_id IS NOT NULL) as count,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE order_id IS NOT NULL) / NULLIF(COUNT(*), 0), 1) || '%' as percentage
FROM public.deliveries;
