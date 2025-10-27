-- Orders × Deliveries Sync Migration (CORRECTED FOR UUID)
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

-- Step 3: Ensure deliveries.order_id is UUID type
-- Check current type and convert if needed
DO $$
BEGIN
    -- If order_id doesn't exist, create it as UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' 
        AND column_name = 'order_id'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN order_id UUID;
        RAISE NOTICE 'Created deliveries.order_id as UUID';
    END IF;
END $$;

-- Step 4: Add foreign key constraint from deliveries to purchase_orders
ALTER TABLE deliveries 
DROP CONSTRAINT IF EXISTS deliveries_order_id_fkey;

ALTER TABLE deliveries 
ADD CONSTRAINT deliveries_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_progress 
ON purchase_orders(delivery_progress);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id_status 
ON deliveries(order_id, status);

-- Step 6: Create function to calculate delivery progress (using UUID)
CREATE OR REPLACE FUNCTION calculate_order_delivery_progress(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_delivered DECIMAL(10,2);
    v_delivered_value DECIMAL(10,2);
    v_ordered_qty DECIMAL(10,2);
    v_progress TEXT;
BEGIN
    -- Get ordered quantity from purchase_orders
    SELECT COALESCE(quantity, 0) 
    INTO v_ordered_qty
    FROM purchase_orders
    WHERE id = p_order_id;
    
    -- Exit if order not found
    IF v_ordered_qty IS NULL THEN
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
    WHERE d.order_id = p_order_id
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
        ordered_qty = v_ordered_qty,
        delivered_qty = v_total_delivered,
        remaining_qty = GREATEST(v_ordered_qty - v_total_delivered, 0),
        delivered_value = v_delivered_value,
        delivery_progress = v_progress,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RAISE NOTICE 'Updated order %: qty=%, delivered=%, progress=%', 
                 p_order_id, v_ordered_qty, v_total_delivered, v_progress;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-update on delivery status change
CREATE OR REPLACE FUNCTION trigger_update_order_delivery_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if order_id is set
    IF NEW.order_id IS NOT NULL THEN
        -- Update when delivery status changes
        IF (TG_OP = 'INSERT') OR 
           (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
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
    v_order_id UUID;
BEGIN
    -- Get order_id from delivery
    SELECT order_id INTO v_order_id
    FROM deliveries
    WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);
    
    -- Update order if found
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

-- Step 9: Initialize ordered_qty from existing quantity field
UPDATE purchase_orders
SET ordered_qty = COALESCE(quantity, 0)
WHERE ordered_qty = 0;

-- Step 10: Recalculate all existing orders' delivery progress
DO $$
DECLARE
    order_record RECORD;
    v_count INT := 0;
BEGIN
    FOR order_record IN 
        SELECT id FROM purchase_orders 
    LOOP
        PERFORM calculate_order_delivery_progress(order_record.id);
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Recalculated delivery progress for % orders', v_count;
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
    po.id,
    po.description,
    po.product_name,
    po.status as order_status,
    po.delivery_progress,
    po.ordered_qty,
    po.delivered_qty,
    po.remaining_qty,
    po.delivered_value,
    COUNT(d.id) as delivery_count,
    COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed_deliveries
FROM purchase_orders po
LEFT JOIN deliveries d ON d.order_id = po.id
GROUP BY po.id, po.description, po.product_name, po.status, po.delivery_progress, 
         po.ordered_qty, po.delivered_qty, po.remaining_qty, po.delivered_value
ORDER BY po.created_at DESC
LIMIT 10;
