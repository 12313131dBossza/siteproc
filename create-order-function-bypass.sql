-- 🔧 CREATE DATABASE FUNCTION TO BYPASS POSTGREST CACHE
-- This function directly inserts orders, bypassing the PostgREST schema cache

CREATE OR REPLACE FUNCTION public.create_order_direct(
  p_project_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_category TEXT,
  p_requested_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_result JSON;
BEGIN
  -- Insert the order directly
  INSERT INTO public.orders (
    project_id,
    amount,
    description,
    category,
    status,
    requested_by,
    requested_at,
    created_at,
    updated_at
  ) VALUES (
    p_project_id,
    p_amount,
    p_description,
    p_category,
    'pending',
    p_requested_by,
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_order_id;

  -- Return the created order as JSON
  SELECT json_build_object(
    'id', o.id,
    'project_id', o.project_id,
    'amount', o.amount,
    'description', o.description,
    'category', o.category,
    'status', o.status,
    'requested_by', o.requested_by,
    'requested_at', o.requested_at,
    'created_at', o.created_at,
    'updated_at', o.updated_at
  ) INTO v_result
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order_direct(UUID, NUMERIC, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_direct(UUID, NUMERIC, TEXT, TEXT, UUID) TO service_role;

-- Test the function
SELECT 'Function created successfully!' as status;
SELECT 'This bypasses PostgREST and inserts directly into the database' as info;
