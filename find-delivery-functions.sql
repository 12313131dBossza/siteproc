-- Find all functions related to delivery
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname LIKE '%delivery%' OR proname LIKE '%order%'
  AND pronamespace = 'public'::regnamespace;

-- Check what triggers exist on deliveries table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('deliveries', 'delivery_items')
  AND event_object_schema = 'public';
