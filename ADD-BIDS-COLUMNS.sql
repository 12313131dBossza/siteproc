-- ADD MISSING COLUMNS TO BIDS TABLE
-- The form expects: item_description, quantity, unit_price
-- But the table only has: description, amount

-- Add the missing columns
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS item_description TEXT,
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2);

-- Update existing bids to copy data if any exist
UPDATE bids 
SET item_description = description 
WHERE item_description IS NULL AND description IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'bids'
ORDER BY ordinal_position;

SELECT 'Bids table columns added successfully!' as status;
