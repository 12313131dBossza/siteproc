-- 🔄 FRESH START: CREATE PURCHASE_ORDERS TABLE
-- Using a different table name to completely bypass the cached "orders" schema

-- Step 1: Create the new purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
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

-- Step 2: Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
CREATE POLICY purchase_orders_insert_policy
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY purchase_orders_select_policy
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY purchase_orders_update_policy
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id 
        AND prof.id = auth.uid()
        AND prof.role IN ('admin', 'owner', 'manager')
    )
  );

-- Step 4: Create indexes
CREATE INDEX purchase_orders_project_id_idx ON public.purchase_orders(project_id);
CREATE INDEX purchase_orders_status_idx ON public.purchase_orders(status);
CREATE INDEX purchase_orders_requested_by_idx ON public.purchase_orders(requested_by);
CREATE INDEX purchase_orders_created_at_idx ON public.purchase_orders(created_at DESC);

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_updated_at_trigger
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_orders_updated_at();

-- Step 6: Grant permissions
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_orders TO anon;

-- Step 7: Verify
SELECT 
  '✅ purchase_orders table created successfully' as status,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
  '✅ RLS policies created' as status,
  policyname
FROM pg_policies 
WHERE tablename = 'purchase_orders';

-- Step 8: Optional - Copy data from old orders table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
    INSERT INTO public.purchase_orders (
      project_id, amount, description, category, status,
      requested_by, requested_at, approved_by, approved_at,
      rejected_by, rejected_at, rejection_reason, created_at, updated_at
    )
    SELECT 
      project_id, amount, description, category, status,
      requested_by, requested_at, approved_by, approved_at,
      rejected_by, rejected_at, rejection_reason, created_at, updated_at
    FROM public.orders
    WHERE amount IS NOT NULL;  -- Only copy valid records
    
    RAISE NOTICE 'Copied existing orders to purchase_orders table';
  END IF;
END $$;

SELECT '🎉 Ready to use! Update your API to use "purchase_orders" instead of "orders"' as final_message;
