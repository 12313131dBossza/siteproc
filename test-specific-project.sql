-- Test specific project that's failing
-- Project ID: 96ab05f-5920-4ce9-9066-9041fa60aac

SELECT 'TESTING SPECIFIC PROJECT:' as info;

-- Check if this exact project exists
SELECT COUNT(*) as project_exists 
FROM projects 
WHERE id = '96ab05f-5920-4ce9-9066-9041fa60aac';

-- Try to select it (this mimics the .single() query)
SELECT 
    id,
    name,
    budget,
    company_id,
    status,
    created_at
FROM projects 
WHERE id = '96ab05f-5920-4ce9-9066-9041fa60aac';

-- Check for any data type issues or corruption
SELECT 
    'DATA TYPE CHECK:' as info,
    id,
    length(id) as id_length,
    budget,
    pg_typeof(budget) as budget_type,
    company_id,
    pg_typeof(company_id) as company_type
FROM projects 
WHERE id = '96ab05f-5920-4ce9-9066-9041fa60aac';

-- Check if there are multiple rows with this ID (shouldn't happen but let's verify)
SELECT 
    'DUPLICATE CHECK:' as info,
    id,
    COUNT(*) as row_count
FROM projects 
WHERE id = '96ab05f-5920-4ce9-9066-9041fa60aac'
GROUP BY id;

-- Show a few other projects for comparison
SELECT 'OTHER PROJECTS FOR COMPARISON:' as info;
SELECT 
    id,
    name,
    budget,
    company_id,
    status
FROM projects 
ORDER BY created_at DESC 
LIMIT 3;
