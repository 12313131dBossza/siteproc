-- COMPLETE FIX: Add ALL missing columns based on the actual interface definitions
-- This ensures the database schema matches what the forms expect

-- =============================================================================
-- BIDS TABLE - Based on Bid interface in bids/pageClient.tsx
-- =============================================================================
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_email TEXT,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS item_description TEXT,
ADD COLUMN IF NOT EXISTS quantity NUMERIC,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC,
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS order_id UUID;

-- =============================================================================
-- CLIENTS TABLE - Based on Client interface in clients/pageClient.tsx
-- =============================================================================
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =============================================================================
-- CONTRACTORS TABLE - Based on Contractor interface (already done above)
-- =============================================================================
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

-- =============================================================================
-- VERIFY ALL COLUMNS
-- =============================================================================
SELECT 'BIDS COLUMNS:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bids' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CLIENTS COLUMNS:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'CONTRACTORS COLUMNS:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contractors' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ ALL COLUMNS ADDED SUCCESSFULLY!' as status;
