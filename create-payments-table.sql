-- ============================================================================
-- PHASE 1E: PAYMENTS TABLE
-- ============================================================================
-- Creates payments table with links to orders and expenses
-- Tracks payment status and methods
-- ============================================================================

-- Step 1: Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  amount NUMERIC(20, 2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'check', -- check, cash, transfer, card, ach
  reference_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_expense ON payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Step 3: Add comments for documentation
COMMENT ON TABLE payments IS 'Payment records linked to orders or expenses';
COMMENT ON COLUMN payments.company_id IS 'Company owning this payment';
COMMENT ON COLUMN payments.project_id IS 'Optional link to project';
COMMENT ON COLUMN payments.order_id IS 'Optional link to purchase order';
COMMENT ON COLUMN payments.expense_id IS 'Optional link to expense';
COMMENT ON COLUMN payments.vendor_name IS 'Vendor/supplier receiving payment';
COMMENT ON COLUMN payments.amount IS 'Payment amount in USD';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: check, cash, transfer, card, ach';
COMMENT ON COLUMN payments.status IS 'Payment status: unpaid, partial, paid';

-- Step 4: Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payments'
    ) THEN
        RAISE NOTICE '✅ Payments table created successfully';
    ELSE
        RAISE NOTICE '❌ ERROR: Payments table was not created';
    END IF;
END $$;

-- Step 5: Show structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Step 6: Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for payments
CREATE POLICY "Users can view payments in their company"
    ON payments FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins and accountants can insert payments"
    ON payments FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Admins and accountants can update payments"
    ON payments FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Admins can delete payments"
    ON payments FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Step 8: Sample query to verify empty table
SELECT 
    '✅ Payments table ready' as status,
    COUNT(*) as current_payments
FROM payments;
