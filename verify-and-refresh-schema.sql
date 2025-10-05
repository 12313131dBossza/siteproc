-- 🔄 VERIFY AND FORCE REFRESH SCHEMA CACHE
-- This will check if the table was actually created and force Supabase to refresh its cache

-- Step 1: Check if orders table exists at all
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders')
    THEN '✅ Orders table EXISTS'
    ELSE '❌ Orders table DOES NOT EXIST'
  END as table_status;

-- Step 2: Show ALL columns in the orders table
SELECT 
  'Column details:' as info,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Step 3: Check if 'amount' column specifically exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'amount'
    )
    THEN '✅ Amount column EXISTS in orders table'
    ELSE '❌ Amount column MISSING from orders table'
  END as amount_column_status;

-- Step 4: Try to do a test insert (this will fail gracefully if RLS blocks it)
-- This forces PostgREST to refresh its schema cache
DO $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  v_order_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ No authenticated user - cannot test insert';
    RETURN;
  END IF;
  
  -- Get a project from user's company
  SELECT p.id INTO v_project_id
  FROM projects p
  INNER JOIN profiles prof ON prof.company_id = p.company_id
  WHERE prof.id = v_user_id
  LIMIT 1;
  
  IF v_project_id IS NULL THEN
    RAISE NOTICE '❌ No projects found for user - cannot test insert';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing insert with user: %, project: %', v_user_id, v_project_id;
  
  -- Try test insert
  BEGIN
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
      'Schema cache refresh test order',
      'Test',
      'pending',
      v_user_id,
      NOW()
    ) RETURNING id INTO v_order_id;
    
    RAISE NOTICE '✅ Test insert SUCCESSFUL! Order ID: %', v_order_id;
    
    -- Clean up test order
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE NOTICE '✅ Test order cleaned up';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
  END;
END $$;

-- Step 5: Force PostgREST schema cache reload by notifying the reload channel
NOTIFY pgrst, 'reload schema';

-- Step 6: Final verification
SELECT 
  '🔄 Schema cache reload triggered' as status,
  'Wait 5-10 seconds, then try creating order from the app' as next_action;
