-- Orders × Deliveries Sync Migration (FIXED VERSION)
-- Handles existing text-based order_ids in deliveries table
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
-- PART 2: Handle deliveries.order_id conversion
-- =====================================================

-- Check current state
SELECT 
  'Current deliveries.order_id type:' as info,
  data_type as current_type,
  COUNT(*) as delivery_count
FROM information_schema.columns
CROSS JOIN deliveries
WHERE table_name = 'deliveries' 
AND column_name = 'order_id'
GROUP BY data_type;

-- If deliveries.order_id is TEXT, we need special handling
DO $$
DECLARE
    v_order_id_type TEXT;
    v_has_deliveries BOOLEAN;
BEGIN
    -- Get current column type
    SELECT data_type INTO v_order_id_type
    FROM information_schema.columns
    WHERE table_name = 'deliveries' 
    AND column_name = 'order_id';
    
    -- Check if there are any deliveries
    SELECT EXISTS(SELECT 1 FROM deliveries LIMIT 1) INTO v_has_deliveries;
    
    RAISE NOTICE 'deliveries.order_id current type: %', v_order_id_type;
    RAISE NOTICE 'Has deliveries: %', v_has_deliveries;
    
    IF v_order_id_type IN ('text', 'character varying') THEN
        RAISE NOTICE 'Converting order_id from TEXT to UUID...';
        
        -- Strategy: 
        -- 1. If delivery has invalid UUID format, set to NULL (orphaned delivery)
        -- 2. Convert valid UUIDs
        -- 3. Change column type
        
        IF v_has_deliveries THEN
            -- First, try to identify which order_ids are valid UUIDs
            RAISE NOTICE 'Checking for valid UUID format...';
            
            -- Update only deliveries where order_id is a valid UUID format
            UPDATE deliveries
            SET order_id = NULL
            WHERE order_id IS NOT NULL
            AND order_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            
            -- Show how many were nullified
            RAISE NOTICE 'Deliveries with invalid UUID format set to NULL';
        END IF;
        
        -- Now change column type (NULLs are fine, valid UUIDs will convert)
        ALTER TABLE deliveries 
        ALTER COLUMN order_id TYPE UUID USING 
            CASE 
                WHEN order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN order_id::uuid 
                ELSE NULL 
            END;
            
        RAISE NOTICE 'Column type changed to UUID';
    ELSE
        RAISE NOTICE 'order_id is already UUID type, skipping conversion';
    END IF;
END $$;

-- =====================================================
-- PART 3: Add foreign key constraint
-- =====================================================

-- Drop existing constraint if any
ALTER TABLE deliveries 
DROP CONSTRAINT IF EXISTS deliveries_order_id_fkey;

-- Add new foreign key constraint (only for non-NULL order_ids)
ALTER TABLE deliveries 
ADD CONSTRAINT deliveries_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- =====================================================
-- PART 4: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_progress 
ON purchase_orders(delivery_progress);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id_status 
ON deliveries(order_id, status);

-- =====================================================
-- PART 5: Create calculation function
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
    -- Only count deliveries with status = 'delivered'
    SELECT 
        COALESCE(SUM(di.quantity), 0),
        COALESCE(SUM(di.total_price), 0)
    INTO v_total_delivered, v_delivered_value
    FROM deliveries d
    JOIN delivery_items di ON di.delivery_id = d.id
    WHERE d.order_id = p_order_id 
    AND d.status IN ('delivered', 'completed'); -- Handle both status names
    
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
    
    RAISE NOTICE 'Order % updated: progress=%, delivered=%/%, value=%', 
        p_order_id, v_progress, v_total_delivered, v_ordered_qty, v_delivered_value;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: Create triggers for auto-updates
-- =====================================================

-- Trigger 1: Update on delivery status change
CREATE OR REPLACE FUNCTION trigger_update_order_delivery_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if order_id is not NULL (skip orphaned deliveries)
    IF NEW.order_id IS NOT NULL THEN
        -- Update when delivery status changes or new delivery inserted
        IF (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.order_id IS DISTINCT FROM NEW.order_id)) 
           OR TG_OP = 'INSERT' THEN
            PERFORM calculate_order_delivery_progress(NEW.order_id);
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
    v_order_id UUID;
BEGIN
    -- Get order_id from delivery
    SELECT order_id INTO v_order_id
    FROM deliveries
    WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);
    
    -- Update order if found and not NULL
    IF v_order_id IS NOT NULL THEN
        PERFORM calculate_order_delivery_progress(v_order_id);
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
-- PART 7: Initialize data
-- =====================================================

-- Initialize ordered_qty from amount (rough estimate)
-- You may want to adjust this calculation based on your business logic
UPDATE purchase_orders
SET ordered_qty = COALESCE(amount / 100, 0)
WHERE ordered_qty = 0 OR ordered_qty IS NULL;

-- =====================================================
-- PART 8: Recalculate all orders
-- =====================================================

DO $$
DECLARE
    order_record RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Recalculating delivery progress for all orders...';
    
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
-- PART 9: Verification & Summary
-- =====================================================

SELECT '========================================' as section;
SELECT '   MIGRATION COMPLETE - VERIFICATION   ' as section;
SELECT '========================================' as section;

-- Check new columns exist
SELECT 
    '✅ NEW COLUMNS ADDED' as status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('delivery_progress', 'ordered_qty', 'delivered_qty', 'remaining_qty', 'delivered_value')
ORDER BY column_name;

-- Check deliveries.order_id type
SELECT 
    '✅ DELIVERIES.ORDER_ID TYPE' as status,
    data_type as current_type
FROM information_schema.columns
WHERE table_name = 'deliveries' AND column_name = 'order_id';

-- Check functions created
SELECT 
    '✅ FUNCTIONS CREATED' as status,
    routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_order_delivery_progress', 'trigger_update_order_delivery_progress', 'trigger_update_order_from_delivery_items')
ORDER BY routine_name;

-- Check triggers created
SELECT 
    '✅ TRIGGERS CREATED' as status,
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('deliveries', 'delivery_items')
ORDER BY event_object_table, trigger_name;

-- Summary of orders by delivery progress
SELECT 
    '📊 ORDERS SUMMARY' as report,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN delivery_progress = 'pending_delivery' THEN 1 END) as pending_delivery,
    COUNT(CASE WHEN delivery_progress = 'partially_delivered' THEN 1 END) as partially_delivered,
    COUNT(CASE WHEN delivery_progress = 'completed' THEN 1 END) as completed
FROM purchase_orders;

-- Show sample orders with delivery progress
SELECT 
    '📦 SAMPLE ORDERS' as section,
    po.id,
    po.description,
    po.status as order_status,
    po.delivery_progress,
    po.ordered_qty,
    po.delivered_qty,
    po.remaining_qty,
    po.delivered_value,
    COUNT(d.id) as linked_deliveries
FROM purchase_orders po
LEFT JOIN deliveries d ON d.order_id = po.id
GROUP BY po.id, po.description, po.status, po.delivery_progress, 
         po.ordered_qty, po.delivered_qty, po.remaining_qty, po.delivered_value
ORDER BY po.created_at DESC
LIMIT 5;

-- Show orphaned deliveries (if any)
SELECT 
    '⚠️ ORPHANED DELIVERIES (order_id is NULL)' as warning,
    COUNT(*) as orphaned_count
FROM deliveries
WHERE order_id IS NULL;

SELECT 
    'Migration completed successfully! ✅' as final_status,
    'You can now test the Orders × Deliveries sync feature' as next_step;
