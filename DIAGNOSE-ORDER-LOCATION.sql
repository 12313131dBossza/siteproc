    -- ═══════════════════════════════════════════════════════════════
    -- DIAGNOSE ORDER LOCATION - Find out where your order data is!
    -- ═══════════════════════════════════════════════════════════════
    -- Run this in Supabase SQL Editor to see where your orders actually are
    -- ═══════════════════════════════════════════════════════════════

    -- Check if orders table has data
    SELECT 
        'orders table' as table_name,
        COUNT(*) as row_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        STRING_AGG(DISTINCT id::text, ', ') as sample_ids
    FROM orders;

    -- Check if purchase_orders table exists and has data
    SELECT 
        'purchase_orders table' as table_name,
        COUNT(*) as row_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        STRING_AGG(DISTINCT id::text, ', ') as sample_ids
    FROM purchase_orders;

    -- Show actual order records from both tables
    SELECT 
        'From orders table' as source,
        id,
        product_name,
        quantity,
        amount,
        status,
        project_id,
        created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10;

    SELECT 
        'From purchase_orders table' as source,
        id,
        product_name,
        quantity,
        amount,
        status,
        project_id,
        created_at
    FROM purchase_orders
    ORDER BY created_at DESC
    LIMIT 10;

    -- IMPORTANT: Look at the results above and tell me:
    -- 1. Which table has rows? (row_count > 0)
    -- 2. Do you see your test order "123213 (5 units @ $5)" in either table?
    -- 
    -- This will tell us if we need to:
    -- Option A: Migrate data from purchase_orders to orders
    -- Option B: Change the API back to use purchase_orders
