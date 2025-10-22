-- COMPREHENSIVE FIX: Add all missing columns to all three tables
-- This ensures clients, bids, and contractors all have the columns the forms expect

-- CONTRACTORS: Add ALL columns the form expects (from Contractor interface)
ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- CLIENTS: Check if any columns are missing
-- Based on typical client forms, ensure these exist:
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- BIDS: Ensure all bid columns exist  
-- (item_description, quantity, unit_price already added, but double-check)
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS vendor_email TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Verify all columns
SELECT 'CONTRACTORS COLUMNS:' as table_name;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'contractors' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CLIENTS COLUMNS:' as table_name;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'BIDS COLUMNS:' as table_name;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bids' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ALL COLUMNS ADDED SUCCESSFULLY!' as status;
