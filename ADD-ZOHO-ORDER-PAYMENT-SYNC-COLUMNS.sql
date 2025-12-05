-- Add Zoho sync columns for Orders (POs) and Payments
-- Run this migration to enable Zoho Books integration
-- Created: December 2025

-- 1. Add payment_terms column to purchase_orders (for Zoho PO sync)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- 2. Add zoho_po_id column to purchase_orders (to track synced POs)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS zoho_po_id TEXT;

-- 3. Add zoho_payment_id column to payments (to track synced payments)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS zoho_payment_id TEXT;

-- 4. Ensure payments has payment_method column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'check';

-- 5. Add supplier column to deliveries (for cost tracking when delivery becomes cost)
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- 6. Create index for faster Zoho sync lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_zoho_po_id ON purchase_orders(zoho_po_id) WHERE zoho_po_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_zoho_payment_id ON payments(zoho_payment_id) WHERE zoho_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_zoho_expense_id ON expenses(zoho_expense_id) WHERE zoho_expense_id IS NOT NULL;

-- 7. Add check constraint for valid payment_terms values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_payment_terms_check'
  ) THEN
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_payment_terms_check
      CHECK (payment_terms IS NULL OR payment_terms IN ('prepaid', 'cod', 'due_on_receipt', 'net_15', 'net_30', 'net_45', 'net_60'));
  END IF;
END $$;

-- Success message
DO $$ BEGIN RAISE NOTICE 'Zoho sync columns added successfully!'; END $$;
