-- Quick diagnostic to check project data
SELECT 'PROJECTS CHECK:' as info;

-- Check if projects table exists and has data
SELECT COUNT(*) as total_projects FROM projects;

-- Show sample projects
SELECT 
    id,
    name,
    status,
    budget,
    company_id,
    created_at
FROM projects 
ORDER BY created_at DESC
LIMIT 10;

-- Check for duplicate project IDs (shouldn't happen but good to verify)
SELECT 
    id,
    COUNT(*) as count
FROM projects 
GROUP BY id 
HAVING COUNT(*) > 1;

-- Check if any projects have null IDs or malformed data
SELECT 
    'NULL/MALFORMED CHECK:' as info,
    COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as null_names
FROM projects;
