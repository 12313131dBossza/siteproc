-- ═══════════════════════════════════════════════════════════════
-- COMPLETE ORDERS TABLE FIX - Ensures orders table has all columns
-- ═══════════════════════════════════════════════════════════════
-- This will make sure the 'orders' table has everything needed
-- Run this in Supabase SQL Editor FIRST
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- First, check if orders table exists and has basic structure
DO $$
BEGIN
    -- Ensure orders table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE EXCEPTION 'orders table does not exist! Create it first or use purchase_orders.';
    END IF;
    
    RAISE NOTICE '✅ orders table exists';
END $$;

-- Add ALL necessary columns to orders table if they don't exist
DO $$
BEGIN
    -- project_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'project_id') THEN
        ALTER TABLE orders ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_orders_project_id ON orders(project_id);
        RAISE NOTICE '✅ Added project_id to orders';
    END IF;

    -- company_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'company_id') THEN
        ALTER TABLE orders ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
        RAISE NOTICE '✅ Added company_id to orders';
    END IF;

    -- created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_by') THEN
        ALTER TABLE orders ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added created_by to orders';
    END IF;

    -- amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'amount') THEN
        ALTER TABLE orders ADD COLUMN amount NUMERIC(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ Added amount to orders';
    END IF;

    -- description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'description') THEN
        ALTER TABLE orders ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description to orders';
    END IF;

    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'category') THEN
        ALTER TABLE orders ADD COLUMN category TEXT;
        RAISE NOTICE '✅ Added category to orders';
    END IF;

    -- vendor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'vendor') THEN
        ALTER TABLE orders ADD COLUMN vendor TEXT;
        RAISE NOTICE '✅ Added vendor to orders';
    END IF;

    -- product_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_name') THEN
        ALTER TABLE orders ADD COLUMN product_name TEXT;
        RAISE NOTICE '✅ Added product_name to orders';
    END IF;

    -- quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'quantity') THEN
        ALTER TABLE orders ADD COLUMN quantity NUMERIC(10,2);
        RAISE NOTICE '✅ Added quantity to orders';
    END IF;

    -- unit_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'unit_price') THEN
        ALTER TABLE orders ADD COLUMN unit_price NUMERIC(10,2);
        RAISE NOTICE '✅ Added unit_price to orders';
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
        RAISE NOTICE '✅ Added status to orders';
    ELSE
        -- Ensure status column has the right constraint
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
        RAISE NOTICE '✅ Updated status constraint on orders';
    END IF;

    -- requested_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'requested_by') THEN
        ALTER TABLE orders ADD COLUMN requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added requested_by to orders';
    END IF;

    -- requested_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'requested_at') THEN
        ALTER TABLE orders ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added requested_at to orders';
    END IF;

    -- approved_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'approved_by') THEN
        ALTER TABLE orders ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added approved_by to orders';
    END IF;

    -- approved_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'approved_at') THEN
        ALTER TABLE orders ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added approved_at to orders';
    END IF;

    -- rejected_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rejected_by') THEN
        ALTER TABLE orders ADD COLUMN rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added rejected_by to orders';
    END IF;

    -- rejected_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rejected_at') THEN
        ALTER TABLE orders ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added rejected_at to orders';
    END IF;

    -- rejection_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rejection_reason') THEN
        ALTER TABLE orders ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE '✅ Added rejection_reason to orders';
    END IF;

    -- delivery_progress
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_progress') THEN
        ALTER TABLE orders ADD COLUMN delivery_progress TEXT CHECK (delivery_progress IN ('pending_delivery', 'partially_delivered', 'completed'));
        RAISE NOTICE '✅ Added delivery_progress to orders';
    END IF;

    -- ordered_qty
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ordered_qty') THEN
        ALTER TABLE orders ADD COLUMN ordered_qty NUMERIC(10,2);
        RAISE NOTICE '✅ Added ordered_qty to orders';
    END IF;

    -- delivered_qty
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_qty') THEN
        ALTER TABLE orders ADD COLUMN delivered_qty NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added delivered_qty to orders';
    END IF;

    -- remaining_qty
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'remaining_qty') THEN
        ALTER TABLE orders ADD COLUMN remaining_qty NUMERIC(10,2);
        RAISE NOTICE '✅ Added remaining_qty to orders';
    END IF;

    -- delivered_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_value') THEN
        ALTER TABLE orders ADD COLUMN delivered_value NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added delivered_value to orders';
    END IF;

    -- created_at (should exist but check)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added created_at to orders';
    END IF;

    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added updated_at to orders';
    END IF;

END $$;

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS orders_select_policy ON orders;
DROP POLICY IF EXISTS orders_insert_policy ON orders;
DROP POLICY IF EXISTS orders_update_policy ON orders;
DROP POLICY IF EXISTS orders_delete_policy ON orders;

-- Create RLS policies for orders table
CREATE POLICY orders_select_policy ON orders
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY orders_insert_policy ON orders
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY orders_update_policy ON orders
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY orders_delete_policy ON orders
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) IN ('admin', 'owner', 'manager')
    );

COMMIT;

-- Verification
SELECT '✅✅✅ ORDERS TABLE READY! ✅✅✅' as status;

SELECT 
    'Column Check' as check_type,
    COUNT(*) as column_count,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN (
    'id', 'project_id', 'company_id', 'amount', 'description', 'category', 
    'status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 
    'rejection_reason', 'created_at', 'updated_at'
);

SELECT '📝 Next step: Redeploy your app with: vercel --force' as instruction;
