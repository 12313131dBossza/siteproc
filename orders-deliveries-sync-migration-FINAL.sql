-- Orders × Deliveries Sync Migration (FINAL VERSION - No Conversion)
-- Strategy: Keep deliveries.order_id as TEXT, add new order_uuid column
-- Date: 2025-01-05

-- =====================================================
-- PART 1: Add delivery tracking fields to purchase_orders
-- =====================================================

-- Step 1: Add delivery_progress field
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS delivery_progress TEXT DEFAULT 'pending_delivery' 
CHECK (delivery_progress IN ('pending_delivery', 'partially_delivered', 'completed'));

-- Step 2: Add tracking fields for quantities and values
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ordered_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_value DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- PART 2: Add new UUID column to deliveries (keep old order_id)
-- =====================================================

-- Add a new UUID column for proper foreign key relationship
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS order_uuid UUID;

-- Create index on new column
CREATE INDEX IF NOT EXISTS idx_deliveries_order_uuid ON deliveries(order_uuid);

-- Try to map existing text order_ids to actual order UUIDs
-- This attempts to match on description or other criteria
UPDATE deliveries d
SET order_uuid = po.id
FROM purchase_orders po
WHERE d.order_uuid IS NULL
AND d.order_id IS NOT NULL
AND (
    -- Try to match by description or amount (adjust based on your data)
    d.order_id LIKE '%' || po.id::text || '%'
    OR po.description LIKE '%' || d.order_id || '%'
);

-- Add foreign key constraint on the new UUID column
ALTER TABLE deliveries 
ADD CONSTRAINT deliveries_order_uuid_fkey 
FOREIGN KEY (order_uuid) REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- =====================================================
-- PART 3: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_progress 
ON purchase_orders(delivery_progress);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_uuid_status 
ON deliveries(order_uuid, status);

-- =====================================================
-- PART 4: Create calculation function (uses order_uuid)
-- =====================================================

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
    -- Use order_uuid for the join
    SELECT 
        COALESCE(SUM(di.quantity), 0),
        COALESCE(SUM(di.total_price), 0)
    INTO v_total_delivered, v_delivered_value
    FROM deliveries d
    JOIN delivery_items di ON di.delivery_id = d.id
    WHERE d.order_uuid = p_order_id 
    AND d.status IN ('delivered', 'completed', 'partial');
    
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

-- =====================================================
-- PART 5: Create triggers for auto-updates
-- =====================================================

-- Trigger 1: Update on delivery status change
CREATE OR REPLACE FUNCTION trigger_update_order_delivery_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if order_uuid is not NULL
    IF NEW.order_uuid IS NOT NULL THEN
        IF (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.order_uuid IS DISTINCT FROM NEW.order_uuid)) 
           OR TG_OP = 'INSERT' THEN
            PERFORM calculate_order_delivery_progress(NEW.order_uuid);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_status_update ON deliveries;
CREATE TRIGGER trigger_delivery_status_update
AFTER INSERT OR UPDATE ON deliveries
FOR EACH ROW
EXECUTE FUNCTION trigger_update_order_delivery_progress();

-- Trigger 2: Update on delivery_items changes
CREATE OR REPLACE FUNCTION trigger_update_order_from_delivery_items()
RETURNS TRIGGER AS $$
DECLARE
    v_order_uuid UUID;
BEGIN
    -- Get order_uuid from delivery
    SELECT order_uuid INTO v_order_uuid
    FROM deliveries
    WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);
    
    -- Update order if found
    IF v_order_uuid IS NOT NULL THEN
        PERFORM calculate_order_delivery_progress(v_order_uuid);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_items_update ON delivery_items;
CREATE TRIGGER trigger_delivery_items_update
AFTER INSERT OR UPDATE OR DELETE ON delivery_items
FOR EACH ROW
EXECUTE FUNCTION trigger_update_order_from_delivery_items();

-- =====================================================
-- PART 6: Initialize data
-- =====================================================

-- Initialize ordered_qty from amount (rough estimate)
UPDATE purchase_orders
SET ordered_qty = COALESCE(amount / 100, 0)
WHERE ordered_qty = 0 OR ordered_qty IS NULL;

-- =====================================================
-- PART 7: Recalculate all orders
-- =====================================================

DO $$
DECLARE
    order_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR order_record IN SELECT id FROM purchase_orders LOOP
        BEGIN
            PERFORM calculate_order_delivery_progress(order_record.id);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to calculate for order %: %', order_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Successfully recalculated % orders', v_count;
END $$;

-- =====================================================
-- PART 8: Verification & Summary
-- =====================================================

SELECT '========================================' as info;
SELECT '   MIGRATION COMPLETE - VERIFICATION   ' as info;
SELECT '========================================' as info;

-- Check new columns on purchase_orders
SELECT 
    '✅ purchase_orders new columns' as status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('delivery_progress', 'ordered_qty', 'delivered_qty', 'remaining_qty', 'delivered_value')
ORDER BY column_name;

-- Check deliveries columns
SELECT 
    '✅ deliveries columns' as status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'deliveries' 
AND column_name IN ('order_id', 'order_uuid')
ORDER BY column_name;

-- Check functions
SELECT 
    '✅ functions created' as status,
    routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%delivery%'
ORDER BY routine_name;

-- Check triggers
SELECT 
    '✅ triggers created' as status,
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('deliveries', 'delivery_items')
ORDER BY event_object_table, trigger_name;

-- Orders summary
SELECT 
    '📊 ORDERS BY DELIVERY STATUS' as report,
    delivery_progress,
    COUNT(*) as count
FROM purchase_orders
GROUP BY delivery_progress
ORDER BY delivery_progress;

-- Sample orders
SELECT 
    '📦 SAMPLE ORDERS' as section,
    po.id,
    LEFT(po.description, 40) as description,
    po.delivery_progress,
    po.ordered_qty,
    po.delivered_qty,
    po.remaining_qty,
    COUNT(d.id) as linked_deliveries
FROM purchase_orders po
LEFT JOIN deliveries d ON d.order_uuid = po.id
GROUP BY po.id, po.description, po.delivery_progress, po.ordered_qty, po.delivered_qty, po.remaining_qty
ORDER BY po.created_at DESC
LIMIT 5;

-- Deliveries status
SELECT 
    '📦 DELIVERIES STATUS' as section,
    COUNT(*) as total_deliveries,
    COUNT(order_uuid) as linked_to_orders,
    COUNT(*) - COUNT(order_uuid) as unlinked
FROM deliveries;

SELECT 
    '✅ Migration completed successfully!' as final_status,
    'Next: Test the frontend at /orders' as next_step;
