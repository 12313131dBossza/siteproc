-- CREATE SAMPLE DATA FOR DASHBOARD
-- This will create test projects, orders, expenses, deliveries to populate the dashboard

DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_project_id UUID;
  v_order_id UUID;
BEGIN
  -- Get your company and user
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM profiles
  WHERE email = 'admin@siteproc.com' -- Change this to your email if different
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Get any user if email not found
    SELECT company_id, id INTO v_company_id, v_user_id
    FROM profiles
    LIMIT 1;
  END IF;

  IF v_company_id IS NOT NULL THEN
    RAISE NOTICE 'Creating sample data for company: %', v_company_id;

    -- Create 3 sample projects
    INSERT INTO projects (company_id, name, description, status, budget, start_date, created_by)
    VALUES 
    (v_company_id, 'Office Renovation', 'Complete office space renovation project', 'active', 50000.00, NOW(), v_user_id),
    (v_company_id, 'Warehouse Construction', 'New warehouse building construction', 'active', 250000.00, NOW() - INTERVAL '10 days', v_user_id),
    (v_company_id, 'Parking Lot Expansion', 'Expand parking lot capacity', 'planning', 35000.00, NOW() + INTERVAL '5 days', v_user_id);

    RAISE NOTICE 'Created projects';

    -- Get the first project ID
    SELECT id INTO v_project_id FROM projects WHERE company_id = v_company_id LIMIT 1;

    -- Create some purchase orders
    INSERT INTO purchase_orders (company_id, project_id, created_by, requested_by, amount, description, category, vendor, product_name, quantity, unit_price, status, requested_at)
    VALUES
    (v_company_id, v_project_id, v_user_id, v_user_id, 5000.00, 'Construction materials', 'Materials', 'ABC Suppliers', 'Cement bags', 100, 50.00, 'pending', NOW()),
    (v_company_id, v_project_id, v_user_id, v_user_id, 12000.00, 'Heavy equipment rental', 'Equipment', 'XYZ Rentals', 'Excavator rental', 1, 12000.00, 'approved', NOW() - INTERVAL '2 days'),
    (v_company_id, v_project_id, v_user_id, v_user_id, 3500.00, 'Safety equipment', 'Safety', 'Safety First Inc', 'Safety gear set', 25, 140.00, 'approved', NOW() - INTERVAL '5 days');

    -- Get the first order ID
    SELECT id INTO v_order_id FROM purchase_orders WHERE company_id = v_company_id LIMIT 1;

    RAISE NOTICE 'Created purchase orders';

    -- Create some expenses (using only basic columns that exist)
    INSERT INTO expenses (company_id, amount, description, category, status, spent_at)
    VALUES
    (v_company_id, 850.00, 'Fuel for equipment', 'Transportation', 'approved', NOW() - INTERVAL '2 days'),
    (v_company_id, 1200.00, 'Worker meals and refreshments', 'Meals', 'approved', NOW() - INTERVAL '5 days'),
    (v_company_id, 450.00, 'Office supplies', 'Supplies', 'pending', NOW());

    RAISE NOTICE 'Created expenses';

    -- Create some deliveries (using only basic columns and valid status values)
    INSERT INTO deliveries (company_id, order_id, delivery_date, status)
    VALUES
    (v_company_id, v_order_id, NOW() - INTERVAL '1 day', 'delivered'),
    (v_company_id, v_order_id, NOW(), 'pending');

    RAISE NOTICE 'Created deliveries';

    -- Create some activity logs
    INSERT INTO activity_logs (company_id, user_id, user_name, user_email, type, action, title, description, status)
    SELECT 
      v_company_id,
      v_user_id,
      p.full_name,
      p.email,
      'project',
      'created',
      'New Project Created',
      'Office Renovation project started',
      'success'
    FROM profiles p WHERE p.id = v_user_id;

    INSERT INTO activity_logs (company_id, user_id, user_name, user_email, type, action, title, description, status, amount)
    SELECT 
      v_company_id,
      v_user_id,
      p.full_name,
      p.email,
      'order',
      'created',
      'Purchase Order Created',
      'Construction materials ordered',
      'success',
      5000.00
    FROM profiles p WHERE p.id = v_user_id;

    RAISE NOTICE 'Created activity logs';

    -- Show summary
    RAISE NOTICE '✅ Sample data created successfully!';
    RAISE NOTICE 'Projects: %', (SELECT COUNT(*) FROM projects WHERE company_id = v_company_id);
    RAISE NOTICE 'Orders: %', (SELECT COUNT(*) FROM purchase_orders WHERE company_id = v_company_id);
    RAISE NOTICE 'Expenses: %', (SELECT COUNT(*) FROM expenses WHERE company_id = v_company_id);
    RAISE NOTICE 'Deliveries: %', (SELECT COUNT(*) FROM deliveries WHERE company_id = v_company_id);
    
  ELSE
    RAISE EXCEPTION 'No user found to create sample data';
  END IF;
END $$;

SELECT '✅ SAMPLE DATA CREATED FOR DASHBOARD!' as status;
