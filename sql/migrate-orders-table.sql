-- Migration: Update orders table to support project-based approval workflow
-- This updates the orders table from product-based to project-based structure

-- 1. Drop existing orders table and recreate with new structure
DROP TABLE IF EXISTS public.orders CASCADE;

-- 2. Create new orders table for project approval workflow
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Users can create orders for projects in their company
DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
CREATE POLICY orders_insert_policy
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id AND prof.id = auth.uid()
    )
  );

-- Users can view orders from their company's projects
DROP POLICY IF EXISTS orders_select_policy ON public.orders;
CREATE POLICY orders_select_policy
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id AND prof.id = auth.uid()
    )
  );

-- Only admins can approve/reject orders
DROP POLICY IF EXISTS orders_update_policy ON public.orders;
CREATE POLICY orders_update_policy
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id 
        AND prof.id = auth.uid()
        AND prof.role IN ('admin', 'owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id 
        AND prof.id = auth.uid()
        AND prof.role IN ('admin', 'owner', 'manager')
    )
  );

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS orders_project_id_idx ON public.orders(project_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_requested_by_idx ON public.orders(requested_by);
CREATE INDEX IF NOT EXISTS orders_approved_by_idx ON public.orders(approved_by);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

-- 6. Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updated_at
DROP TRIGGER IF EXISTS orders_updated_at_trigger ON public.orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_updated_at();

-- 8. Verification
SELECT 'Orders table migrated successfully!' AS status;
SELECT 'New structure: project_id, amount, description, category, status, requested_by, etc.' AS info;
