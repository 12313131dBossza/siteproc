-- Create a test project with a proper UUID
-- This will give you a valid project to test with

INSERT INTO projects (
    id,
    name,
    budget,
    status,
    company_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Test Project - Order Linking',
    50000.00,
    'active',
    (SELECT id FROM companies LIMIT 1),
    NOW(),
    NOW()
) 
ON CONFLICT (id) DO NOTHING
RETURNING id, name, budget, status;

-- Also show existing projects
SELECT 'EXISTING PROJECTS:' as info;
SELECT 
    id,
    name,
    budget,
    status,
    created_at
FROM projects 
ORDER BY created_at DESC 
LIMIT 5;
