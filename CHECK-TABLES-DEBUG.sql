-- CHECK EXISTING TABLES AND THEIR COLUMNS
-- Run this to see what tables exist and what columns they have

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'bids', 'contractors')
ORDER BY table_name;

-- Check clients table columns
SELECT 'CLIENTS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check bids table columns
SELECT 'BIDS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bids' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check contractors table columns
SELECT 'CONTRACTORS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contractors' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('clients', 'bids', 'contractors')
ORDER BY tablename, cmd;
