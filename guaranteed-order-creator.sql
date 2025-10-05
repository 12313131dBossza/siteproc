-- ✅ GUARANTEED WORKING SOLUTION
-- This will either create an order OR tell you exactly what to do

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  my_project_id UUID;
  new_order_id UUID;
  company_count INT;
  project_count INT;
BEGIN
  my_user_id := auth.uid();
  
  -- Check company
  SELECT company_id INTO my_company_id FROM profiles WHERE id = my_user_id;
  SELECT COUNT(*) INTO company_count FROM companies WHERE id = my_company_id;
  
  IF my_company_id IS NULL OR company_count = 0 THEN
    RAISE NOTICE '❌ PROBLEM: You do not have a company!';
    RAISE NOTICE '📝 SOLUTION: Run this SQL to create a company:';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO companies (name) VALUES (''My Company'') RETURNING id;';
    RAISE NOTICE '-- Copy the returned ID, then run:';
    RAISE NOTICE 'UPDATE profiles SET company_id = ''PASTE_ID_HERE'' WHERE id = auth.uid();';
    RAISE NOTICE '';
    RAISE EXCEPTION 'Setup incomplete. See instructions above.';
  END IF;
  
  -- Check project
  SELECT id INTO my_project_id FROM projects WHERE company_id = my_company_id LIMIT 1;
  SELECT COUNT(*) INTO project_count FROM projects WHERE company_id = my_company_id;
  
  IF my_project_id IS NULL OR project_count = 0 THEN
    RAISE NOTICE '❌ PROBLEM: You do not have any projects!';
    RAISE NOTICE '📝 SOLUTION: Go to % and create a project', 'https://siteproc1.vercel.app/projects';
    RAISE NOTICE 'OR run this SQL:';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO projects (name, company_id, status, created_by)';
    RAISE NOTICE 'VALUES (''My Project'', ''%'', ''active'', ''%'');', my_company_id, my_user_id;
    RAISE NOTICE '';
    RAISE EXCEPTION 'No projects found. See instructions above.';
  END IF;
  
  -- Everything is ready - create order!
  RAISE NOTICE '✅ Company ID: %', my_company_id;
  RAISE NOTICE '✅ Project ID: %', my_project_id;
  RAISE NOTICE '🚀 Creating order...';
  
  INSERT INTO purchase_orders (
    project_id,
    amount,
    description,
    category,
    status,
    requested_by,
    requested_at
  ) VALUES (
    my_project_id,
    2500.00,
    'Test Order - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
    'Equipment',
    'pending',
    my_user_id,
    NOW()
  )
  RETURNING id INTO new_order_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉 SUCCESS! 🎉🎉🎉';
  RAISE NOTICE 'Order ID: %', new_order_id;
  RAISE NOTICE '';
  RAISE NOTICE '👉 Go to: https://siteproc1.vercel.app/orders';
  RAISE NOTICE '👉 Press F5 to refresh';
  RAISE NOTICE '';
  
END $$;

-- Show the order we just created
SELECT 
  '✅ Your New Order:' as message,
  po.id,
  po.amount,
  po.description,
  po.status,
  po.created_at
FROM purchase_orders po
WHERE po.requested_by = auth.uid()
ORDER BY po.created_at DESC
LIMIT 1;
