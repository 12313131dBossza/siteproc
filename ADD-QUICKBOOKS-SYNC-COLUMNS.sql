-- Add QuickBooks sync columns to expenses and purchase_orders tables
-- Date: 2025-11-05

-- Add QB sync columns to expenses
DO $$
BEGIN
  -- Add quickbooks_bill_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'quickbooks_bill_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN quickbooks_bill_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_expenses_qb_bill_id ON expenses(quickbooks_bill_id);
    RAISE NOTICE 'Added quickbooks_bill_id to expenses';
  END IF;

  -- Add quickbooks_synced_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'quickbooks_synced_at'
  ) THEN
    ALTER TABLE expenses ADD COLUMN quickbooks_synced_at TIMESTAMPTZ;
    RAISE NOTICE 'Added quickbooks_synced_at to expenses';
  END IF;
END $$;

-- Add QB sync columns to purchase_orders
DO $$
BEGIN
  -- Add quickbooks_po_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'quickbooks_po_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN quickbooks_po_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_qb_po_id ON purchase_orders(quickbooks_po_id);
    RAISE NOTICE 'Added quickbooks_po_id to purchase_orders';
  END IF;

  -- Add quickbooks_synced_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'quickbooks_synced_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN quickbooks_synced_at TIMESTAMPTZ;
    RAISE NOTICE 'Added quickbooks_synced_at to purchase_orders';
  END IF;
END $$;

-- Create vendor mappings table if it doesn't exist
CREATE TABLE IF NOT EXISTS quickbooks_vendor_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  siteproc_vendor TEXT NOT NULL,
  quickbooks_vendor_id TEXT NOT NULL,
  quickbooks_vendor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, siteproc_vendor)
);

CREATE INDEX IF NOT EXISTS idx_qb_vendor_mappings_company ON quickbooks_vendor_mappings(company_id);

-- Enable RLS on vendor mappings
ALTER TABLE quickbooks_vendor_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendor mappings
DROP POLICY IF EXISTS "Users can view company vendor mappings" ON quickbooks_vendor_mappings;
CREATE POLICY "Users can view company vendor mappings"
  ON quickbooks_vendor_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage vendor mappings" ON quickbooks_vendor_mappings;
CREATE POLICY "Admins can manage vendor mappings"
  ON quickbooks_vendor_mappings FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'bookkeeper')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON quickbooks_vendor_mappings TO authenticated;

-- Success message
SELECT 'QuickBooks sync columns and vendor mappings table added successfully!' as status;
