-- Create test data to verify the deliveries system works
-- Run this to populate the database with sample data

-- First check what companies and users exist
SELECT 'Available users and companies:' as info;
SELECT 
    u.email,
    p.full_name,
    p.role,
    c.name as company_name,
    p.company_id
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY u.email;

-- Create some test orders and deliveries
-- Note: Replace the UUIDs below with actual user/company IDs from your system

DO $$
DECLARE
    test_user_id uuid;
    test_company_id uuid;
    test_order_id uuid;
    test_product_id uuid;
BEGIN
    -- Get a test user (preferably admin/member)
    SELECT u.id, p.company_id 
    INTO test_user_id, test_company_id
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.role IN ('admin', 'member', 'owner')
    AND p.company_id IS NOT NULL
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No suitable test user found. Make sure you have users with company assignments.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using test user: % in company: %', test_user_id, test_company_id;
    
    -- Create a test product first (if products table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        INSERT INTO products (id, company_id, name, sku, unit, price, stock, created_by)
        VALUES (
            gen_random_uuid(),
            test_company_id,
            'Test Construction Material',
            'TCM-001',
            'bags',
            25.00,
            100,
            test_user_id
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO test_product_id;
        
        -- If insert didn't happen due to conflict, get existing product
        IF test_product_id IS NULL THEN
            SELECT id INTO test_product_id 
            FROM products 
            WHERE company_id = test_company_id 
            LIMIT 1;
        END IF;
    ELSE
        -- Create a dummy product ID for testing
        test_product_id := gen_random_uuid();
        RAISE NOTICE 'Products table does not exist, using dummy product ID: %', test_product_id;
    END IF;
    
    -- Create a test order
    INSERT INTO orders (
        id, company_id, order_number, status, total_amount, 
        delivery_address, created_by, created_at
    ) VALUES (
        gen_random_uuid(),
        test_company_id,
        'ORD-' || to_char(now(), 'YYYYMMDD') || '-001',
        'approved',
        125.00,
        '123 Test Construction Site',
        test_user_id,
        now()
    )
    RETURNING id INTO test_order_id;
    
    RAISE NOTICE 'Created test order: %', test_order_id;
    
    -- Create test order items
    INSERT INTO order_items (
        order_id, product_id, ordered_qty, delivered_qty, 
        unit_price, created_at
    ) VALUES 
    (test_order_id, test_product_id, 5, 2, 25.00, now()),
    (test_order_id, test_product_id, 3, 0, 25.00, now());
    
    -- Create test deliveries
    INSERT INTO deliveries (
        order_id, product_id, delivered_qty, delivered_at,
        note, company_id, created_by, created_at
    ) VALUES 
    (
        test_order_id, 
        test_product_id, 
        2, 
        now() - interval '1 day',
        'First delivery - materials received in good condition',
        test_company_id,
        test_user_id,
        now() - interval '1 day'
    ),
    (
        test_order_id, 
        test_product_id, 
        1, 
        now() - interval '2 hours',
        'Partial delivery - remaining materials to follow',
        test_company_id,
        test_user_id,
        now() - interval '2 hours'
    );
    
    RAISE NOTICE 'Test data created successfully!';
    
END $$;

-- Verify the test data was created
SELECT 'Test data verification:' as status;

SELECT 'Orders created:' as info, COUNT(*) as count FROM orders;
SELECT 'Order items created:' as info, COUNT(*) as count FROM order_items;
SELECT 'Deliveries created:' as info, COUNT(*) as count FROM deliveries;

-- Show the created test data
SELECT 'Test Orders:' as info;
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.created_at,
    c.name as company_name
FROM orders o
LEFT JOIN companies c ON o.company_id = c.id
ORDER BY o.created_at DESC
LIMIT 3;

SELECT 'Test Deliveries:' as info;
SELECT 
    d.id,
    d.delivered_qty,
    d.delivered_at,
    d.note,
    d.created_at
FROM deliveries d
ORDER BY d.created_at DESC
LIMIT 3;
