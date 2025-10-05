-- 🧪 CREATE TEST ORDER DATA
-- Run this to create sample orders that will show up in your orders page

-- First, get your current user and project info
DO $$
DECLARE
  current_user_id UUID;
  current_company_id UUID;
  test_project_id UUID;
BEGIN
  -- Get current user's ID and company
  SELECT id, company_id 
  INTO current_user_id, current_company_id
  FROM profiles 
  WHERE id = auth.uid();

  RAISE NOTICE 'Your user ID: %', current_user_id;
  RAISE NOTICE 'Your company ID: %', current_company_id;

  IF current_company_id IS NULL THEN
    RAISE EXCEPTION 'No company_id found for your profile. Please update your profile first.';
  END IF;

  -- Get or create a test project
  SELECT id INTO test_project_id
  FROM projects
  WHERE company_id = current_company_id
  LIMIT 1;

  IF test_project_id IS NULL THEN
    RAISE NOTICE 'No project found. Creating a test project...';
    
    INSERT INTO projects (name, company_id, status, start_date)
    VALUES ('Test Project', current_company_id, 'active', NOW())
    RETURNING id INTO test_project_id;
    
    RAISE NOTICE 'Created test project: %', test_project_id;
  ELSE
    RAISE NOTICE 'Using existing project: %', test_project_id;
  END IF;

  -- Create test orders in purchase_orders table
  INSERT INTO purchase_orders (
    project_id,
    amount,
    description,
    category,
    status,
    requested_by,
    requested_at,
    created_at
  ) VALUES
  (
    test_project_id,
    1500.00,
    'Office supplies for Q1',
    'Supplies',
    'pending',
    current_user_id,
    NOW(),
    NOW()
  ),
  (
    test_project_id,
    3500.00,
    'New laptops for development team',
    'Equipment',
    'pending',
    current_user_id,
    NOW(),
    NOW() - INTERVAL '1 day'
  ),
  (
    test_project_id,
    500.00,
    'Monthly software subscriptions',
    'Software',
    'approved',
    current_user_id,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

  RAISE NOTICE '✅ Created 3 test orders successfully!';
  RAISE NOTICE '🔍 Check your orders page now';
END $$;

-- Verify the created orders
SELECT 
  '✅ Your orders:' as status,
  po.id,
  po.amount,
  po.description,
  po.category,
  po.status,
  p.name as project_name,
  prof.full_name as requested_by,
  po.created_at
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
INNER JOIN profiles prof ON prof.id = po.requested_by
WHERE prof.id = auth.uid()
ORDER BY po.created_at DESC;

SELECT '🎉 Done! Refresh your orders page to see the orders.' as message;
