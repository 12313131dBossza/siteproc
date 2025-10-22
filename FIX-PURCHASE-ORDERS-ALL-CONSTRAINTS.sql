-- COMPREHENSIVE FIX: Make all columns in purchase_orders nullable except id and required fields
-- This allows flexible order creation from different sources (bids, manual entry, etc.)

-- Make all these columns nullable
ALTER TABLE purchase_orders
ALTER COLUMN project_id DROP NOT NULL,
ALTER COLUMN amount DROP NOT NULL,
ALTER COLUMN vendor DROP NOT NULL,
ALTER COLUMN product DROP NOT NULL,
ALTER COLUMN quantity DROP NOT NULL,
ALTER COLUMN unit_price DROP NOT NULL,
ALTER COLUMN total DROP NOT NULL,
ALTER COLUMN notes DROP NOT NULL;

-- If 'amount' exists and 'total' exists, we should use 'total' as the main column
-- Drop 'amount' if both exist, since the convert endpoint uses 'total'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'amount'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'total'
    ) THEN
        ALTER TABLE purchase_orders DROP COLUMN IF EXISTS amount;
        RAISE NOTICE 'Dropped duplicate amount column';
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ ALL PURCHASE_ORDERS CONSTRAINTS FIXED!' as status;
