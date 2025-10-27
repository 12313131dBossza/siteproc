-- Orders × Deliveries Sync Migration (FIXED)
-- Add delivery tracking fields to purchase_orders and link deliveries properly

-- Step 1: Add delivery_progress field to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS delivery_progress TEXT DEFAULT 'not_started' 
CHECK (delivery_progress IN ('not_started', 'partially_delivered', 'completed'));

-- Step 2: Add tracking fields for quantities and values
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ordered_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_value DECIMAL(10,2) DEFAULT 0;

-- Step 3: Check current state of deliveries.order_id
-- It appears to store order_number (text like "ORD-xxx") not UUID
-- Let's verify what we have:
DO $$
BEGIN
    -- Check if order_id column exists and its type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' 
        AND column_name = 'order_id'
    ) THEN
        RAISE NOTICE 'deliveries.order_id column exists';
    ELSE
        -- Create order_id as TEXT if it doesn't exist
        ALTER TABLE deliveries ADD COLUMN order_id TEXT;
        RAISE NOTICE 'Created deliveries.order_id as TEXT';
    END IF;
END $$;

-- Step 4: Create an index on order_number in purchase_orders for fast lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number 
ON purchase_orders(order_number);

-- Step 5: Add index on deliveries for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id_status 
ON deliveries(order_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_progress 
ON purchase_orders(delivery_progress);

-- Step 6: Create function to calculate delivery progress
-- This function looks up orders by order_number (not UUID)
CREATE OR REPLACE FUNCTION calculate_order_delivery_progress(p_order_number TEXT)
RETURNS VOID AS $$
DECLARE
    v_order_id UUID;
    v_total_delivered DECIMAL(10,2);
    v_delivered_value DECIMAL(10,2);
    v_ordered_qty DECIMAL(10,2);
    v_progress TEXT;
BEGIN
    -- Get order UUID and ordered quantity
    SELECT id, COALESCE(ordered_qty, 0) 
    INTO v_order_id, v_ordered_qty
    FROM purchase_orders
    WHERE order_number = p_order_number;
    
    -- Exit if order not found
    IF v_order_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate total delivered quantity and value from delivery_items
    -- Only count deliveries that are marked as 'delivered'
    SELECT 
        COALESCE(SUM(di.quantity), 0),
        COALESCE(SUM(di.total_price), 0)
    INTO v_total_delivered, v_delivered_value
    FROM deliveries d
    JOIN delivery_items di ON di.delivery_id = d.id
    WHERE d.order_id = p_order_number
    AND d.status = 'delivered';
    
    -- Determine delivery progress status
    IF v_total_delivered = 0 THEN
        v_progress := 'not_started';
    ELSIF v_total_delivered >= v_ordered_qty THEN
        v_progress := 'completed';
    ELSE
        v_progress := 'partially_delivered';
    END IF;
    
    -- Update purchase_orders with calculated values
    UPDATE purchase_orders
    SET 
        delivered_qty = v_total_delivered,
        remaining_qty = GREATEST(v_ordered_qty - v_total_delivered, 0),
        delivered_value = v_delivered_value,
        delivery_progress = v_progress,
        updated_at = NOW()
    WHERE id = v_order_id;
    
    RAISE NOTICE 'Updated order %: delivered=%, progress=%', p_order_number, v_total_delivered, v_progress;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-update on delivery status change
CREATE OR REPLACE FUNCTION trigger_update_order_delivery_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if order_id is set
    IF NEW.order_id IS NOT NULL AND NEW.order_id != '' THEN
        -- Update when delivery status changes
        IF (TG_OP = 'INSERT') OR 
           (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
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

-- Step 8: Create trigger for delivery_items changes
CREATE OR REPLACE FUNCTION trigger_update_order_from_delivery_items()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id TEXT;
BEGIN
    -- Get order_id (order_number) from delivery
    SELECT order_id INTO v_order_id
    FROM deliveries
    WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);
    
    -- Update order if found
    IF v_order_id IS NOT NULL AND v_order_id != '' THEN
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

-- Step 9: Initialize ordered_qty from existing purchase_order_items if available
-- This calculates total quantity ordered from order items
UPDATE purchase_orders po
SET ordered_qty = (
    SELECT COALESCE(SUM(poi.quantity), 0)
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = po.id
)
WHERE EXISTS (
    SELECT 1 FROM purchase_order_items 
    WHERE purchase_order_id = po.id
);

-- If no items exist, try to derive from amount (optional)
UPDATE purchase_orders
SET ordered_qty = COALESCE(amount / 100, 1)  
WHERE ordered_qty = 0 AND amount > 0;

-- Step 10: Recalculate all existing orders' delivery progress
DO $$
DECLARE
    order_record RECORD;
BEGIN
    FOR order_record IN 
        SELECT order_number FROM purchase_orders 
        WHERE order_number IS NOT NULL
    LOOP
        PERFORM calculate_order_delivery_progress(order_record.order_number);
    END LOOP;
END $$;

-- Verify the changes
SELECT 
    'purchase_orders' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN delivery_progress = 'not_started' THEN 1 END) as not_started,
    COUNT(CASE WHEN delivery_progress = 'partially_delivered' THEN 1 END) as partially_delivered,
    COUNT(CASE WHEN delivery_progress = 'completed' THEN 1 END) as completed
FROM purchase_orders;

-- Show sample data with deliveries
SELECT 
    po.order_number,
    po.status as order_status,
    po.delivery_progress,
    po.ordered_qty,
    po.delivered_qty,
    po.remaining_qty,
    po.delivered_value,
    COUNT(d.id) as delivery_count,
    COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed_deliveries
FROM purchase_orders po
LEFT JOIN deliveries d ON d.order_id = po.order_number
GROUP BY po.id, po.order_number, po.status, po.delivery_progress, 
         po.ordered_qty, po.delivered_qty, po.remaining_qty, po.delivered_value
ORDER BY po.created_at DESC
LIMIT 10;
