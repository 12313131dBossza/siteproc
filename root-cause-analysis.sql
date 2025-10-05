-- 🔍 COMPREHENSIVE ROOT CAUSE ANALYSIS
-- This will tell us EXACTLY what's wrong

-- ============================================
-- SECTION 1: VERIFY TABLE STRUCTURE
-- ============================================
SELECT '========== SECTION 1: TABLE STRUCTURE ==========' as section;

-- Does the table exist?
SELECT 
  'Step 1.1: Table Existence' as step,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'orders'
    )
    THEN '✅ YES - orders table exists'
    ELSE '❌ NO - orders table does not exist!'
  END as result;

-- Show EVERY column in the table
SELECT 
  'Step 1.2: All Columns in orders table' as step,
  ordinal_position as position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check specifically for 'amount' column
SELECT 
  'Step 1.3: Amount Column Check' as step,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'amount'
    )
    THEN '✅ YES - amount column exists'
    ELSE '❌ NO - amount column does NOT exist!'
  END as result;

-- ============================================
-- SECTION 2: CHECK IF THERE ARE MULTIPLE SCHEMAS
-- ============================================
SELECT '========== SECTION 2: SCHEMA CONFLICTS ==========' as section;

-- Are there orders tables in other schemas?
SELECT 
  'Step 2.1: Orders tables in ALL schemas' as step,
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'orders';

-- ============================================
-- SECTION 3: CHECK USER PERMISSIONS
-- ============================================
SELECT '========== SECTION 3: USER & PERMISSIONS ==========' as section;

-- Who is the current user?
SELECT 
  'Step 3.1: Current User' as step,
  current_user as postgres_user,
  auth.uid() as auth_user_id,
  auth.role() as auth_role;

-- Does user have a profile?
SELECT 
  'Step 3.2: User Profile' as step,
  p.id,
  p.company_id,
  p.role,
  p.full_name,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id = auth.uid();

-- Does user have accessible projects?
SELECT 
  'Step 3.3: User Projects' as step,
  proj.id,
  proj.name,
  proj.company_id
FROM projects proj
INNER JOIN profiles prof ON prof.company_id = proj.company_id
WHERE prof.id = auth.uid()
LIMIT 3;

-- ============================================
-- SECTION 4: CHECK RLS POLICIES
-- ============================================
SELECT '========== SECTION 4: RLS POLICIES ==========' as section;

-- Is RLS enabled?
SELECT 
  'Step 4.1: RLS Status' as step,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders';

-- What policies exist?
SELECT 
  'Step 4.2: RLS Policies' as step,
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'orders';

-- ============================================
-- SECTION 5: TEST DIRECT DATABASE INSERT
-- ============================================
SELECT '========== SECTION 5: DIRECT INSERT TEST ==========' as section;

DO $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  v_order_id UUID;
  v_error_detail TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  RAISE NOTICE 'Step 5.1: Current user ID: %', COALESCE(v_user_id::TEXT, 'NULL - NOT AUTHENTICATED!');
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEM FOUND: User is not authenticated!';
    RAISE NOTICE 'This means the SQL Editor is not running as the logged-in user.';
    RETURN;
  END IF;
  
  -- Get a project
  SELECT p.id INTO v_project_id
  FROM projects p
  INNER JOIN profiles prof ON prof.company_id = p.company_id
  WHERE prof.id = v_user_id
  LIMIT 1;
  
  RAISE NOTICE 'Step 5.2: Found project ID: %', COALESCE(v_project_id::TEXT, 'NULL - NO PROJECTS!');
  
  IF v_project_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEM FOUND: User has no projects in their company!';
    RETURN;
  END IF;
  
  -- Try to insert
  BEGIN
    RAISE NOTICE 'Step 5.3: Attempting insert into orders table...';
    
    INSERT INTO public.orders (
      project_id,
      amount,
      description,
      category,
      status,
      requested_by,
      requested_at
    ) VALUES (
      v_project_id,
      1.00,
      'Diagnostic test order',
      'Test',
      'pending',
      v_user_id,
      NOW()
    ) RETURNING id INTO v_order_id;
    
    RAISE NOTICE '✅ SUCCESS: Order created with ID: %', v_order_id;
    RAISE NOTICE 'This means the database INSERT works fine!';
    RAISE NOTICE 'The problem is likely in the API or schema cache.';
    
    -- Clean up
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE NOTICE '✅ Test order cleaned up';
    
  EXCEPTION 
    WHEN insufficient_privilege THEN
      RAISE NOTICE '❌ PROBLEM FOUND: RLS policy blocking insert!';
      RAISE NOTICE 'Error: %', SQLERRM;
    WHEN foreign_key_violation THEN
      RAISE NOTICE '❌ PROBLEM FOUND: Foreign key violation!';
      RAISE NOTICE 'Error: %', SQLERRM;
    WHEN check_violation THEN
      RAISE NOTICE '❌ PROBLEM FOUND: Check constraint violation!';
      RAISE NOTICE 'Error: %', SQLERRM;
    WHEN undefined_column THEN
      RAISE NOTICE '❌ PROBLEM FOUND: Column does not exist in table!';
      RAISE NOTICE 'Error: %', SQLERRM;
      RAISE NOTICE 'This means the migration did NOT actually run!';
    WHEN OTHERS THEN
      RAISE NOTICE '❌ PROBLEM FOUND: Unexpected error!';
      RAISE NOTICE 'Error: %', SQLERRM;
      RAISE NOTICE 'SQL State: %', SQLSTATE;
  END;
END $$;

-- ============================================
-- SECTION 6: CHECK POSTGREST CONFIGURATION
-- ============================================
SELECT '========== SECTION 6: API CONFIGURATION ==========' as section;

-- Check what schema PostgREST is using
SELECT 
  'Step 6.1: Database Config' as step,
  current_database() as database_name,
  current_schema() as current_schema,
  version() as postgres_version;

-- ============================================
-- SECTION 7: FINAL DIAGNOSIS
-- ============================================
SELECT '========== SECTION 7: SUMMARY ==========' as section;

SELECT 
  'Final Check' as step,
  json_build_object(
    'table_exists', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'orders' AND schemaname = 'public'),
    'amount_column_exists', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'amount' AND table_schema = 'public'),
    'rls_enabled', (SELECT rowsecurity FROM pg_tables WHERE tablename = 'orders' AND schemaname = 'public'),
    'policies_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders'),
    'user_authenticated', auth.uid() IS NOT NULL,
    'user_has_profile', EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()),
    'user_has_projects', EXISTS(
      SELECT 1 FROM projects p 
      INNER JOIN profiles prof ON prof.company_id = p.company_id 
      WHERE prof.id = auth.uid()
    )
  ) as status_summary;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

SELECT 
  '🎯 DIAGNOSIS COMPLETE' as final_message,
  'Review the results above to see what is wrong' as instruction,
  'Schema cache reload signal sent' as action_taken;
