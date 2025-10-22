-- 🔧 CREATE PURCHASE_ORDERS TABLE
-- This table was missing from your database!
-- Run this entire script in Supabase SQL Editor

-- ==============================================
-- STEP 1: Create purchase_orders table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  vendor TEXT,
  product_name TEXT,
  quantity NUMERIC(12,2),
  unit_price NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Delivery sync fields
  delivery_progress NUMERIC(5,2) DEFAULT 0,
  ordered_qty NUMERIC(12,2),
  delivered_qty NUMERIC(12,2) DEFAULT 0,
  remaining_qty NUMERIC(12,2),
  delivered_value NUMERIC(12,2) DEFAULT 0,
  
  -- Foreign key to projects
  CONSTRAINT purchase_orders_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ==============================================
-- STEP 2: Create indexes for performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id 
  ON public.purchase_orders(project_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
  ON public.purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_requested_by 
  ON public.purchase_orders(requested_by);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at 
  ON public.purchase_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_progress 
  ON public.purchase_orders(delivery_progress);

-- ==============================================
-- STEP 3: Enable Row Level Security (RLS)
-- ==============================================

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 4: Create RLS Policies
-- ==============================================

-- Policy: Users can view orders for their company's projects
DROP POLICY IF EXISTS purchase_orders_select_policy ON public.purchase_orders;
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

-- Policy: Users can create orders for their company's projects
DROP POLICY IF EXISTS purchase_orders_insert_policy ON public.purchase_orders;
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

-- Policy: Admins can update orders
DROP POLICY IF EXISTS purchase_orders_update_policy ON public.purchase_orders;
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

-- Policy: Admins can delete orders
DROP POLICY IF EXISTS purchase_orders_delete_policy ON public.purchase_orders;
CREATE POLICY purchase_orders_delete_policy
  ON public.purchase_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      INNER JOIN public.profiles prof ON prof.company_id = p.company_id
      WHERE p.id = project_id 
        AND prof.id = auth.uid()
        AND prof.role IN ('admin', 'owner')
    )
  );

-- ==============================================
-- STEP 5: Create updated_at trigger
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS purchase_orders_updated_at_trigger ON public.purchase_orders;
CREATE TRIGGER purchase_orders_updated_at_trigger
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_orders_updated_at();

-- ==============================================
-- STEP 6: Grant permissions
-- ==============================================

GRANT ALL ON public.purchase_orders TO authenticated;
GRANT SELECT ON public.purchase_orders TO anon;

-- ==============================================
-- STEP 7: Reload schema cache
-- ==============================================

NOTIFY pgrst, 'reload schema';

-- ==============================================
-- VERIFICATION
-- ==============================================

SELECT 
  '🎉 purchase_orders table created successfully!' as message;

-- Show table structure
SELECT 
  '=== TABLE STRUCTURE ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- Show indexes
SELECT 
  '=== INDEXES ===' as section,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'purchase_orders' AND schemaname = 'public';

-- Show RLS policies
SELECT 
  '=== RLS POLICIES ===' as section,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'purchase_orders';

-- Final message
SELECT 
  '✅ DONE! Wait 30 seconds then refresh your Health page.' as final_message,
  'All endpoints should now be green!' as expectation;
