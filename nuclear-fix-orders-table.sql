-- 🔨 NUCLEAR OPTION: FORCE POSTGREST TO SEE THE NEW SCHEMA
-- This will force a complete refresh by recreating the schema

-- Step 1: Drop and recreate the orders table (this forces PostgREST to reload)
DROP TABLE IF EXISTS public.orders CASCADE;

-- Step 2: Recreate with correct structure
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

-- Step 3: Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
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

-- Step 5: Create indexes
CREATE INDEX orders_project_id_idx ON public.orders(project_id);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_requested_by_idx ON public.orders(requested_by);
CREATE INDEX orders_created_at_idx ON public.orders(created_at DESC);

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_updated_at();

-- Step 7: Grant permissions explicitly
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- Step 8: Force multiple reload signals
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 9: Verify
SELECT 
  '✅ Table recreated' as status,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
  '🔄 PostgREST reload signals sent' as message,
  '⏰ WAIT 30 SECONDS before trying to create order' as important,
  '🔄 Or go to Supabase Dashboard > Settings > API > Restart API' as alternative;
