-- Check if the get_order_deliveries function exists
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_order_deliveries'
  AND n.nspname = 'public';

-- If it exists, test it
SELECT * FROM get_order_deliveries(
  '49fd1a08-a4f2-401f-9468-26c4b665f287'::UUID,
  '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::UUID
);
