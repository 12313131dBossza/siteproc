-- Create the trigger function to calculate order delivery progress
CREATE OR REPLACE FUNCTION update_order_delivery_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_order_uuid UUID;
    v_total_delivered NUMERIC;
    v_total_qty NUMERIC;
    v_ordered_qty NUMERIC;
    v_remaining_qty NUMERIC;
    v_progress TEXT;
BEGIN
    -- Get the order_uuid based on which table triggered this
    IF TG_TABLE_NAME = 'deliveries' THEN
        -- Triggered from deliveries table
        IF TG_OP = 'DELETE' THEN
            v_order_uuid := OLD.order_uuid;
        ELSE
            v_order_uuid := NEW.order_uuid;
        END IF;
    ELSIF TG_TABLE_NAME = 'delivery_items' THEN
        -- Triggered from delivery_items table
        IF TG_OP = 'DELETE' THEN
            SELECT order_uuid INTO v_order_uuid
            FROM deliveries
            WHERE id = OLD.delivery_id;
        ELSE
            SELECT order_uuid INTO v_order_uuid
            FROM deliveries
            WHERE id = NEW.delivery_id;
        END IF;
    END IF;

    -- Skip if no order_uuid
    IF v_order_uuid IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate total delivered quantity and value
    SELECT 
        COALESCE(SUM(di.quantity), 0),
        COALESCE(SUM(di.total_price), 0)
    INTO v_total_qty, v_total_delivered
    FROM delivery_items di
    JOIN deliveries d ON d.id = di.delivery_id
    WHERE d.order_uuid = v_order_uuid
      AND d.status = 'delivered';

    -- Get the ordered quantity
    SELECT ordered_qty INTO v_ordered_qty
    FROM purchase_orders
    WHERE id = v_order_uuid;

    -- If ordered_qty is 0 or NULL, try to infer from order amount
    IF v_ordered_qty IS NULL OR v_ordered_qty = 0 THEN
        -- For now, just use delivered quantity
        v_ordered_qty := v_total_qty;
    END IF;

    -- Calculate remaining quantity
    v_remaining_qty := GREATEST(v_ordered_qty - v_total_qty, 0);

    -- Determine progress status
    IF v_total_qty = 0 THEN
        v_progress := 'pending_delivery';
    ELSIF v_total_qty >= v_ordered_qty AND v_ordered_qty > 0 THEN
        v_progress := 'completed';
    ELSE
        v_progress := 'partially_delivered';
    END IF;

    -- Update the purchase order
    UPDATE purchase_orders
    SET 
        delivered_qty = v_total_qty,
        delivered_value = v_total_delivered,
        remaining_qty = v_remaining_qty,
        delivery_progress = v_progress,
        updated_at = NOW()
    WHERE id = v_order_uuid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on delivery_items table
DROP TRIGGER IF EXISTS trigger_update_order_progress ON delivery_items;
CREATE TRIGGER trigger_update_order_progress
    AFTER INSERT OR UPDATE OR DELETE ON delivery_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_delivery_progress();

-- Also create trigger on deliveries table for status changes
DROP TRIGGER IF EXISTS trigger_update_order_progress_on_delivery ON deliveries;
CREATE TRIGGER trigger_update_order_progress_on_delivery
    AFTER INSERT OR UPDATE OF status ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_order_delivery_progress();

-- Now manually recalculate for your order
-- First set the ordered_qty
UPDATE purchase_orders
SET ordered_qty = 10
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- Manually calculate and update the order
WITH delivery_totals AS (
    SELECT 
        COALESCE(SUM(di.quantity), 0) as total_qty,
        COALESCE(SUM(di.total_price), 0) as total_value
    FROM delivery_items di
    JOIN deliveries d ON d.id = di.delivery_id
    WHERE d.order_uuid = '49fd1a08-a4f2-401f-9468-26c4b665f287'
      AND d.status = 'delivered'
)
UPDATE purchase_orders po
SET 
    delivered_qty = dt.total_qty,
    delivered_value = dt.total_value,
    remaining_qty = GREATEST(po.ordered_qty - dt.total_qty, 0),
    delivery_progress = CASE
        WHEN dt.total_qty = 0 THEN 'pending_delivery'
        WHEN dt.total_qty >= po.ordered_qty AND po.ordered_qty > 0 THEN 'completed'
        ELSE 'partially_delivered'
    END,
    updated_at = NOW()
FROM delivery_totals dt
WHERE po.id = '49fd1a08-a4f2-401f-9468-26c4b665f287';

-- Check the result
SELECT 
    id,
    description,
    amount,
    delivery_progress,
    ordered_qty,
    delivered_qty,
    remaining_qty,
    delivered_value,
    status
FROM purchase_orders
WHERE id = '49fd1a08-a4f2-401f-9468-26c4b665f287';
