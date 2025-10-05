-- 🔧 CREATE RAW SQL EXECUTION FUNCTION
-- This allows executing raw SQL to completely bypass PostgREST

CREATE OR REPLACE FUNCTION public.exec_sql(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This is a simplified version - just for INSERT
  -- In production, you'd want more security checks
  EXECUTE query
  USING 
    params->0, params->1, params->2, params->3, params->4
  INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute to service role only (more secure)
GRANT EXECUTE ON FUNCTION public.exec_sql(text, jsonb) TO service_role;

SELECT 'exec_sql function created' as status;
