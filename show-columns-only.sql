-- SIMPLE COLUMN CHECK
-- Just show the columns for each table

SELECT 'CLIENTS COLUMNS:' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 'BIDS COLUMNS:', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bids' AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 'CONTRACTORS COLUMNS:', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contractors' AND table_schema = 'public'
ORDER BY ordinal_position;
