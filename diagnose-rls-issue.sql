-- 🔍 DIAGNOSE RLS ISSUE - Why expenses aren't showing in API
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: CHECK RLS STATUS ON EXPENSES TABLE
-- ============================================================================
SELECT schemaname, tablename, rowsecurity, enablerls 
FROM pg_tables 
WHERE tablename = 'expenses';

-- ============================================================================
-- STEP 2: LIST ALL RLS POLICIES ON EXPENSES
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'expenses';

-- ============================================================================
-- STEP 3: CHECK CURRENT USER CONTEXT
-- ============================================================================
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('request.jwt.claims', true) as jwt_claims;

-- ============================================================================
-- STEP 4: TEST DIRECT ACCESS TO EXPENSES (WHAT API SEES)
-- ============================================================================
SELECT 'EXPENSES VISIBLE TO CURRENT USER:' as info, COUNT(*) as count FROM expenses;
SELECT 'TEST EXPENSES VISIBLE:' as info, COUNT(*) as count FROM expenses WHERE description LIKE 'WORKING TEST%';

-- ============================================================================
-- STEP 5: TEMPORARY FIX - DISABLE RLS FOR TESTING
-- ============================================================================
-- UNCOMMENT THE NEXT LINE TO TEMPORARILY DISABLE RLS:
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: VERIFY EXPENSES EXIST (BYPASSING RLS)
-- ============================================================================
SELECT 'ALL EXPENSES IN DB (BYPASSING RLS):' as info, COUNT(*) as total 
FROM expenses;

SELECT 'DETAILED TEST EXPENSES:' as info,
       id,
       amount,
       description,
       status,
       created_at
FROM expenses 
WHERE description LIKE 'WORKING TEST%'
ORDER BY created_at DESC;
