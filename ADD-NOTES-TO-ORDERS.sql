-- Add missing 'notes' column to purchase_orders table
-- This is needed when converting bids to orders

ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify it was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
  AND column_name = 'notes';

SELECT '✅ NOTES COLUMN ADDED TO PURCHASE_ORDERS!' as status;
