-- Fix delivery progress columns on BOTH orders tables
-- Run this in your Supabase SQL editor

-- ============================================
-- PART 1: Fix purchase_orders table
-- ============================================
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

-- Update ALL approved purchase_orders
UPDATE purchase_orders
SET 
    delivery_progress = 'not_started',
    ordered_qty = COALESCE(quantity, 0),
    delivered_qty = COALESCE(delivered_qty, 0),
    remaining_qty = COALESCE(quantity, 0) - COALESCE(delivered_qty, 0),
    delivered_value = COALESCE(delivered_value, 0)
WHERE status = 'approved';

-- ============================================
-- PART 2: Fix orders table (if exists)
-- ============================================
DO $$ 
BEGIN
    -- Check if orders table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        -- Add delivery_progress column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'orders' AND column_name = 'delivery_progress') THEN
            ALTER TABLE orders ADD COLUMN delivery_progress TEXT DEFAULT 'not_started';
        END IF;

        -- Add ordered_qty column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'orders' AND column_name = 'ordered_qty') THEN
            ALTER TABLE orders ADD COLUMN ordered_qty NUMERIC DEFAULT 0;
        END IF;

        -- Add delivered_qty column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'orders' AND column_name = 'delivered_qty') THEN
            ALTER TABLE orders ADD COLUMN delivered_qty NUMERIC DEFAULT 0;
        END IF;

        -- Add remaining_qty column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'orders' AND column_name = 'remaining_qty') THEN
            ALTER TABLE orders ADD COLUMN remaining_qty NUMERIC DEFAULT 0;
        END IF;

        -- Add delivered_value column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'orders' AND column_name = 'delivered_value') THEN
            ALTER TABLE orders ADD COLUMN delivered_value NUMERIC DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Update ALL approved orders in orders table
UPDATE orders
SET 
    delivery_progress = 'not_started',
    ordered_qty = COALESCE(quantity, 0),
    delivered_qty = COALESCE(delivered_qty, 0),
    remaining_qty = COALESCE(quantity, 0) - COALESCE(delivered_qty, 0),
    delivered_value = COALESCE(delivered_value, 0)
WHERE status = 'approved' 
  AND (delivery_progress IS NULL OR delivery_progress = '');

-- Show results from both tables
SELECT 'purchase_orders' as table_name, id, description, status, delivery_progress, ordered_qty
FROM purchase_orders WHERE status = 'approved' LIMIT 5;

SELECT 'orders' as table_name, id, description, status, delivery_progress, ordered_qty
FROM orders WHERE status = 'approved' LIMIT 5;
