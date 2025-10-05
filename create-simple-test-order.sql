-- 🚀 SIMPLE TEST ORDER CREATION
-- Run this in Supabase SQL Editor to create a test order
-- This will use your existing data and create one simple order

DO $$
DECLARE
  my_user_id UUID;
  my_company_id UUID;
  my_project_id UUID;
  new_order_id UUID;
BEGIN
  -- Get your user ID
  my_user_id := auth.uid();
  RAISE NOTICE 'Your user ID: %', my_user_id;
  
  -- Get your company ID
  SELECT company_id INTO my_company_id
  FROM profiles
  WHERE id = my_user_id;
  
  IF my_company_id IS NULL THEN
    RAISE EXCEPTION 'You do not have a company_id in your profile. Please update your profile first.';
  END IF;
  
  RAISE NOTICE 'Your company ID: %', my_company_id;
  
  -- Get or create a project
  SELECT id INTO my_project_id
  FROM projects
  WHERE company_id = my_company_id
  LIMIT 1;
  
  IF my_project_id IS NULL THEN
    RAISE NOTICE 'No project found. Creating a test project...';
    
    -- Check what columns the projects table actually has
    -- and insert with only the required columns
    INSERT INTO projects (name, company_id, status, created_by)
    VALUES (
      'Test Project - ' || to_char(NOW(), 'YYYY-MM-DD'),
      my_company_id,
      'active',
      my_user_id
    )
    RETURNING id INTO my_project_id;
    
    RAISE NOTICE 'Created project: %', my_project_id;
  ELSE
    RAISE NOTICE 'Using existing project: %', my_project_id;
  END IF;
  
  -- Create a test order in purchase_orders table
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
    'Test Order - Office Equipment',
    'Equipment',
    'pending',
    my_user_id,
    NOW()
  )
  RETURNING id INTO new_order_id;
  
  RAISE NOTICE '✅ SUCCESS! Created order: %', new_order_id;
  RAISE NOTICE '🔍 Now check your orders page!';
  
END $$;

-- Verify the order was created
SELECT 
  '✅ Your new order:' as message,
  po.id,
  po.amount,
  po.description,
  po.status,
  p.name as project_name,
  po.created_at
FROM purchase_orders po
INNER JOIN projects p ON p.id = po.project_id
WHERE po.requested_by = auth.uid()
ORDER BY po.created_at DESC
LIMIT 1;
