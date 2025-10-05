-- Check deliveries.status enum values
SELECT 
    enumlabel as valid_status_values
FROM pg_enum
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'delivery_status'
)
ORDER BY enumsortorder;

-- Also check what status values are actually being used
SELECT DISTINCT status, COUNT(*) as count
FROM deliveries
GROUP BY status
ORDER BY count DESC;
