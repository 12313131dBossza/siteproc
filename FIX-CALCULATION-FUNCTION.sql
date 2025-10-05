-- Fix: Update calculation function to use correct delivery status enum values
-- The issue: function checks for 'completed' and 'partial' which don't exist in enum

CREATE OR REPLACE FUNCTION calculate_order_delivery_progress(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_delivered DECIMAL(10,2);
    v_delivered_value DECIMAL(10,2);
    v_ordered_qty DECIMAL(10,2);
    v_progress TEXT;
BEGIN
    -- Get ordered quantity from purchase_orders
    SELECT COALESCE(ordered_qty, 0) INTO v_ordered_qty
    FROM purchase_orders
    WHERE id = p_order_id;
    
    -- Calculate total delivered quantity and value from delivery_items
    -- Only count deliveries with status = 'delivered' (remove invalid 'completed', 'partial')
    SELECT 
        COALESCE(SUM(di.quantity), 0),
        COALESCE(SUM(di.total_price), 0)
    INTO v_total_delivered, v_delivered_value
    FROM deliveries d
    JOIN delivery_items di ON di.delivery_id = d.id
    WHERE d.order_uuid = p_order_id 
    AND d.status = 'delivered'; -- Only valid status
    
    -- Determine delivery progress status
    IF v_total_delivered = 0 THEN
        v_progress := 'pending_delivery';
    ELSIF v_ordered_qty > 0 AND v_total_delivered >= v_ordered_qty THEN
        v_progress := 'completed';
    ELSIF v_total_delivered > 0 THEN
        v_progress := 'partially_delivered';
    ELSE
        v_progress := 'pending_delivery';
    END IF;
    
    -- Update purchase_orders with calculated values
    UPDATE purchase_orders
    SET 
        delivered_qty = v_total_delivered,
        remaining_qty = GREATEST(v_ordered_qty - v_total_delivered, 0),
        delivered_value = v_delivered_value,
        delivery_progress = v_progress,
        updated_at = NOW()
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was updated
SELECT 'Function updated successfully! Now only checks for status = ''delivered''' as result;

-- Test it manually on the test order
SELECT calculate_order_delivery_progress('af770470-071a-4f39-ad31-44bf2e3d8053');

-- Check the results
SELECT 
    'After function fix:' as status,
    id,
    description,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value
FROM purchase_orders
WHERE id = 'af770470-071a-4f39-ad31-44bf2e3d8053';
