-- ADD-ORDER-ID-TO-CHANGE-ORDERS.sql
-- Purpose: Add order_id column to change_orders table

BEGIN;

-- Add order_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
    AND table_name='change_orders' 
    AND column_name='order_id'
  ) THEN
    ALTER TABLE public.change_orders ADD COLUMN order_id uuid;
    RAISE NOTICE 'Added order_id column to change_orders table';
  ELSE
    RAISE NOTICE 'order_id column already exists';
  END IF;
END $$;

-- Add index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_change_orders_order_id 
ON public.change_orders(order_id);

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
