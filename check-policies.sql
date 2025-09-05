-- Check current RLS policies on expenses table
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
WHERE tablename = 'expenses' AND schemaname = 'public'
ORDER BY policyname;
