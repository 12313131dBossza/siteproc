-- Check what delivery_progress column already exists as
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name LIKE '%progress%'
ORDER BY ordinal_position;

-- Check for any existing delivery tracking columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name IN ('delivery_progress', 'ordered_qty', 'delivered_qty', 'remaining_qty', 'delivered_value')
ORDER BY ordinal_position;
