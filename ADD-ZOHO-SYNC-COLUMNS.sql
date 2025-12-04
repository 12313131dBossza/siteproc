-- Add Zoho sync columns to expenses table
-- This allows tracking which expenses have been synced to Zoho Books

-- Add zoho_expense_id column to expenses table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'zoho_expense_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN zoho_expense_id TEXT;
        COMMENT ON COLUMN expenses.zoho_expense_id IS 'Zoho Books expense ID for synced expenses';
    END IF;
END $$;

-- Add zoho_synced_at column for tracking sync time
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'zoho_synced_at'
    ) THEN
        ALTER TABLE expenses ADD COLUMN zoho_synced_at TIMESTAMPTZ;
        COMMENT ON COLUMN expenses.zoho_synced_at IS 'Timestamp when expense was synced to Zoho Books';
    END IF;
END $$;

-- Add index for faster lookup of unsynced expenses
CREATE INDEX IF NOT EXISTS idx_expenses_zoho_sync 
ON expenses (company_id, status, zoho_expense_id) 
WHERE status = 'approved' AND zoho_expense_id IS NULL;

-- Add zoho_invoice_id column to invoices table (if invoices table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'zoho_invoice_id'
        ) THEN
            ALTER TABLE invoices ADD COLUMN zoho_invoice_id TEXT;
            COMMENT ON COLUMN invoices.zoho_invoice_id IS 'Zoho Books invoice ID for synced invoices';
        END IF;
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('zoho_expense_id', 'zoho_synced_at');
