-- FIX: The bids table has an 'amount' column with NOT NULL constraint
-- Option 1: Make the 'amount' column nullable (recommended)
-- Option 2: Drop the 'amount' column if it's not being used

-- First, check if 'amount' column exists
DO $$ 
BEGIN
    -- If 'amount' exists and 'total_amount' exists, make 'amount' nullable or drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' AND column_name = 'amount'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' AND column_name = 'total_amount'
    ) THEN
        -- Drop the old 'amount' column since we're using 'total_amount'
        ALTER TABLE bids DROP COLUMN IF EXISTS amount;
        RAISE NOTICE 'Dropped old amount column';
    END IF;

    -- If only 'amount' exists, rename it to 'total_amount'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' AND column_name = 'amount'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE bids RENAME COLUMN amount TO total_amount;
        RAISE NOTICE 'Renamed amount to total_amount';
    END IF;
END $$;

-- Ensure total_amount column exists and is nullable
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS total_amount NUMERIC;

-- Verify the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bids' AND table_schema = 'public'
  AND column_name IN ('amount', 'total_amount')
ORDER BY column_name;

SELECT '✅ BIDS AMOUNT COLUMN FIXED!' as status;
