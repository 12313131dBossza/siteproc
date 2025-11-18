-- CREATE-CHANGE-ORDERS-TABLE-COMPLETE.sql
-- Purpose: Create or update change_orders table with all required columns

BEGIN;

-- Drop existing table if you want to recreate (CAREFUL: This deletes data!)
-- DROP TABLE IF EXISTS public.change_orders CASCADE;

-- Create the change_orders table with all necessary columns
CREATE TABLE IF NOT EXISTS public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid,
  order_id uuid,
  job_id uuid,
  created_by uuid,
  title text,
  description text,
  reason text,
  proposed_qty numeric(12,2),
  cost_delta numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  amount numeric(12,2) DEFAULT 0,
  approved_by uuid,
  approved_at timestamptz,
  approver_email text,
  rejected_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  approval_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table already exists
DO $$
BEGIN
  -- order_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='order_id') THEN
    ALTER TABLE public.change_orders ADD COLUMN order_id uuid;
    RAISE NOTICE 'Added order_id column';
  END IF;
  
  -- job_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='job_id') THEN
    ALTER TABLE public.change_orders ADD COLUMN job_id uuid;
    RAISE NOTICE 'Added job_id column';
  END IF;
  
  -- proposed_qty
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='proposed_qty') THEN
    ALTER TABLE public.change_orders ADD COLUMN proposed_qty numeric(12,2);
    RAISE NOTICE 'Added proposed_qty column';
  END IF;
  
  -- cost_delta
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='cost_delta') THEN
    ALTER TABLE public.change_orders ADD COLUMN cost_delta numeric(12,2) DEFAULT 0;
    RAISE NOTICE 'Added cost_delta column';
  END IF;
  
  -- reason
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='reason') THEN
    ALTER TABLE public.change_orders ADD COLUMN reason text;
    RAISE NOTICE 'Added reason column';
  END IF;
  
  -- approver_email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='approver_email') THEN
    ALTER TABLE public.change_orders ADD COLUMN approver_email text;
    RAISE NOTICE 'Added approver_email column';
  END IF;
  
  -- company_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='company_id') THEN
    ALTER TABLE public.change_orders ADD COLUMN company_id uuid;
    RAISE NOTICE 'Added company_id column';
  END IF;
  
  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='status') THEN
    ALTER TABLE public.change_orders ADD COLUMN status text NOT NULL DEFAULT 'pending';
    RAISE NOTICE 'Added status column';
  END IF;
  
  -- created_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='created_by') THEN
    ALTER TABLE public.change_orders ADD COLUMN created_by uuid;
    RAISE NOTICE 'Added created_by column';
  END IF;
  
  -- approved_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='approved_by') THEN
    ALTER TABLE public.change_orders ADD COLUMN approved_by uuid;
    RAISE NOTICE 'Added approved_by column';
  END IF;
  
  -- approved_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='approved_at') THEN
    ALTER TABLE public.change_orders ADD COLUMN approved_at timestamptz;
    RAISE NOTICE 'Added approved_at column';
  END IF;
  
  -- description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='description') THEN
    ALTER TABLE public.change_orders ADD COLUMN description text;
    RAISE NOTICE 'Added description column';
  END IF;
  
  -- project_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='project_id') THEN
    ALTER TABLE public.change_orders ADD COLUMN project_id uuid;
    RAISE NOTICE 'Added project_id column';
  END IF;
  
  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='created_at') THEN
    ALTER TABLE public.change_orders ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    RAISE NOTICE 'Added created_at column';
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='updated_at') THEN
    ALTER TABLE public.change_orders ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- Add status constraint
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='change_orders' AND c.conname='change_orders_status_chk'
  ) THEN
    ALTER TABLE public.change_orders DROP CONSTRAINT change_orders_status_chk;
    RAISE NOTICE 'Dropped old status constraint';
  END IF;
  
  -- Add new constraint
  ALTER TABLE public.change_orders
    ADD CONSTRAINT change_orders_status_chk CHECK (status IN ('pending','approved','rejected'));
  RAISE NOTICE 'Added status constraint';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Status constraint already exists or cannot be added: %', SQLERRM;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_change_orders_company_id ON public.change_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_order_id ON public.change_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_job_id ON public.change_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON public.change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_created_at ON public.change_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_orders_company_status ON public.change_orders(company_id, status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_change_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_change_orders_updated_at ON public.change_orders;
CREATE TRIGGER trg_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_change_orders_updated_at();

-- Enable Row Level Security
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view change orders from their company" ON public.change_orders;
DROP POLICY IF EXISTS "Users can create change orders for their company" ON public.change_orders;
DROP POLICY IF EXISTS "Users can update change orders from their company" ON public.change_orders;

-- Create RLS policies
CREATE POLICY "Users can view change orders from their company"
  ON public.change_orders FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create change orders for their company"
  ON public.change_orders FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update change orders from their company"
  ON public.change_orders FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Show final structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'change_orders'
ORDER BY ordinal_position;
