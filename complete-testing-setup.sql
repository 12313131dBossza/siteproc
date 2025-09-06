-- Complete Setup for Testing Expense Workflow
-- Run this in Supabase SQL Editor

-- Step 1: Check available companies first
SELECT 'Available Companies:' as info, id, name FROM public.companies ORDER BY created_at;

-- Step 2: Assign member role and company to bossbcz@gmail.com
DO $$
DECLARE
    target_company_id uuid;
    member_user_id uuid;
BEGIN
    -- Get the first available company (you can change this to specific company)
    SELECT id INTO target_company_id FROM public.companies ORDER BY created_at LIMIT 1;
    
    -- Get the member user ID
    SELECT u.id INTO member_user_id FROM auth.users u WHERE u.email = 'bossbcz@gmail.com';
    
    -- Update the user's profile with member role and company assignment
    IF member_user_id IS NOT NULL AND target_company_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET 
            role = 'member',
            company_id = target_company_id
        WHERE id = member_user_id;
        
        RAISE NOTICE 'Assigned user bossbcz@gmail.com as member to company %', target_company_id;
    ELSE
        RAISE NOTICE 'User or company not found. User ID: %, Company ID: %', member_user_id, target_company_id;
    END IF;
END $$;

-- Step 3: Verify role and company assignments
SELECT 
    u.email,
    p.role,
    p.full_name,
    c.name as company_name,
    p.company_id,
    'Role and Company assigned' as status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
ORDER BY c.name, p.role, u.email;

-- Step 4: Insert test expenses with actual user IDs for testing
DO $$
DECLARE
    member_user_id uuid;
    admin_user_id uuid;
    target_company_id uuid;
BEGIN
    -- Get the member user ID
    SELECT u.id INTO member_user_id 
    FROM auth.users u
    WHERE u.email = 'bossbcz@gmail.com';
    
    -- Get an admin user ID from the same company
    SELECT u.id INTO admin_user_id 
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE p.role IN ('admin', 'owner')
    LIMIT 1;
    
    -- Get the company ID (use the same company for testing)
    SELECT company_id INTO target_company_id 
    FROM public.profiles 
    WHERE id = member_user_id;
    
    -- Insert expenses for member user (with all proper columns)
    IF member_user_id IS NOT NULL THEN
        INSERT INTO public.expenses (
            vendor, category, amount, status, user_id, memo, description, spent_at
        ) VALUES
            ('Office Supplies Store', 'office', 150.00, 'pending', member_user_id, 'Site office supplies', 'Printer paper and pens for construction site office', CURRENT_DATE),
            ('Gas Station Downtown', 'transport', 85.00, 'pending', member_user_id, 'Fuel costs', 'Fuel for company truck - site visits', CURRENT_DATE - INTERVAL '1 day'),
            ('Hardware Store', 'materials', 75.50, 'pending', member_user_id, 'Small tools', 'Small tools and screws for repairs', CURRENT_DATE - INTERVAL '2 days')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created test expenses for member user in company %', target_company_id;
    END IF;
    
    -- Insert expenses for admin user (auto-approved)
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.expenses (
            vendor, category, amount, status, user_id, memo, description, spent_at, approved_by
        ) VALUES
            ('Major Construction Supply', 'materials', 2500.00, 'approved', admin_user_id, 'Bulk materials', 'Bulk cement and steel order for Phase 1', CURRENT_DATE - INTERVAL '3 days', admin_user_id),
            ('Equipment Rental Co', 'equipment', 800.00, 'approved', admin_user_id, 'Equipment rental', 'Excavator rental for 2 days', CURRENT_DATE - INTERVAL '1 day', admin_user_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created test expenses for admin user';
    END IF;
END $$;

-- Step 5: Verification - Show test data by user role and company
SELECT 'TESTING DATA READY - Company-Aware Setup' as status;

SELECT 
    'Member User Expenses (Pending):' as section,
    e.vendor,
    e.amount,
    e.status,
    e.category,
    e.memo,
    e.spent_at,
    u.email as created_by,
    c.name as company_name
FROM public.expenses e
JOIN auth.users u ON e.user_id = u.id
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.role = 'member';

SELECT 
    'Admin User Expenses (Auto-Approved):' as section,
    e.vendor,
    e.amount,
    e.status,
    e.category,
    e.memo,
    e.spent_at,
    u.email as created_by,
    c.name as company_name
FROM public.expenses e
JOIN auth.users u ON e.user_id = u.id
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.role IN ('admin', 'owner');

-- Show user-company assignments for verification
SELECT 
    'User-Company Assignments:' as section,
    u.email,
    p.role,
    c.name as company_name,
    p.company_id
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
ORDER BY c.name, p.role;
