-- CHECK ALL TABLE COLUMNS TO FIND MORE MISSING COLUMNS
-- This will help us identify all schema mismatches

-- CLIENTS TABLE
SELECT 'CLIENTS TABLE:' as info;
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position;

-- BIDS TABLE  
SELECT 'BIDS TABLE:' as info;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'bids' AND table_schema = 'public'
ORDER BY ordinal_position;

-- CONTRACTORS TABLE
SELECT 'CONTRACTORS TABLE:' as info;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contractors' AND table_schema = 'public'
ORDER BY ordinal_position;
