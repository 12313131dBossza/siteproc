-- 🔧 QUICK FIX: Update project "11" to have correct company_id

-- Show the current state
SELECT 
  '=== BEFORE FIX ===' as section,
  p.id as project_id,
  p.name as project_name,
  p.company_id as project_company_id,
  (SELECT company_id FROM profiles WHERE id = auth.uid()) as your_company_id
FROM projects p
WHERE p.name = '11' OR p.project_number = '11' OR p.code = '11'
ORDER BY created_at DESC
LIMIT 1;

-- Fix the project to have YOUR company_id
UPDATE projects
SET company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
WHERE (name = '11' OR project_number = '11' OR code = '11')
  AND company_id IS DISTINCT FROM (SELECT company_id FROM profiles WHERE id = auth.uid());

-- Show the updated state
SELECT 
  '=== AFTER FIX ===' as section,
  p.id as project_id,
  p.name as project_name,
  p.company_id as project_company_id,
  (SELECT company_id FROM profiles WHERE id = auth.uid()) as your_company_id,
  CASE 
    WHEN p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) 
    THEN '✅ MATCHES!' 
    ELSE '❌ DOES NOT MATCH' 
  END as status
FROM projects p
WHERE p.name = '11' OR p.project_number = '11' OR p.code = '11'
ORDER BY created_at DESC
LIMIT 1;

-- Verify you can now see it
SELECT 
  '=== CAN YOU SEE IT NOW? ===' as section,
  id,
  name,
  company_id,
  status
FROM projects
WHERE name = '11' OR project_number = '11' OR code = '11';
