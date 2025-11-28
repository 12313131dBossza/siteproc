-- Fix delivery progress columns on purchase_orders table
-- Run this in your Supabase SQL editor

-- First, check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add delivery_progress column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_progress') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_progress TEXT DEFAULT 'not_started';
    END IF;

    -- Add ordered_qty column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'ordered_qty') THEN
        ALTER TABLE purchase_orders ADD COLUMN ordered_qty NUMERIC DEFAULT 0;
    END IF;

    -- Add delivered_qty column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivered_qty') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivered_qty NUMERIC DEFAULT 0;
    END IF;

    -- Add remaining_qty column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'remaining_qty') THEN
        ALTER TABLE purchase_orders ADD COLUMN remaining_qty NUMERIC DEFAULT 0;
    END IF;

    -- Add delivered_value column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivered_value') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivered_value NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Update ALL approved orders to have proper delivery tracking values
-- (this will overwrite any existing values)
UPDATE purchase_orders
SET 
    delivery_progress = 'not_started',
    ordered_qty = COALESCE(quantity, 0),
    delivered_qty = COALESCE(delivered_qty, 0),
    remaining_qty = COALESCE(quantity, 0) - COALESCE(delivered_qty, 0),
    delivered_value = COALESCE(delivered_value, 0)
WHERE status = 'approved';

-- Also update pending orders to have a null delivery_progress (not applicable yet)
UPDATE purchase_orders
SET delivery_progress = NULL
WHERE status = 'pending';

-- Show current state of approved orders
SELECT id, description, status, delivery_progress, ordered_qty, delivered_qty, remaining_qty
FROM purchase_orders 
WHERE status = 'approved'
LIMIT 10;
