-- Test different query formats to find what works

-- 1. Basic query without relationships (should always work)
SELECT * FROM documents 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Query with explicit join (traditional SQL)
SELECT 
  d.*,
  p.id as profile_id,
  p.full_name,
  p.email
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
WHERE d.deleted_at IS NULL
ORDER BY d.created_at DESC
LIMIT 5;

-- 3. Test if PostgREST can find the relationship by column name
-- This is what the API should be doing
-- Note: In PostgREST, you reference the foreign key column directly
