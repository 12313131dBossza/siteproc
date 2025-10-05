-- 🔧 FIX ORDERS TABLE SCHEMA
-- This will check your current orders table and add the missing columns

-- Step 1: Check what columns currently exist
SELECT 
  'Current orders table columns:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Step 2: Check if we need to migrate from old structure
DO $$
BEGIN
  -- Check if 'amount' column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'amount'
  ) THEN
    RAISE NOTICE '❌ Amount column is MISSING - need to migrate table';
    
    -- Check if this is the old product-based orders table
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'product_id'
    ) THEN
      RAISE NOTICE '⚠️  Found OLD orders table with product_id - this needs full migration';
      RAISE NOTICE '🔄 Backing up old orders and creating new structure...';
      
      -- Backup old orders if any exist
      CREATE TABLE IF NOT EXISTS orders_backup_old AS 
      SELECT * FROM orders;
      
      RAISE NOTICE '✅ Backed up old orders to orders_backup_old';
      
      -- Drop old table
      DROP TABLE IF EXISTS orders CASCADE;
      
      -- Create new project-based orders table
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
      
      RAISE NOTICE '✅ Created new orders table with correct schema';
      
      -- Enable RLS
      ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS Policies
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
      
      RAISE NOTICE '✅ Created RLS policies';
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS orders_project_id_idx ON public.orders(project_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
      CREATE INDEX IF NOT EXISTS orders_requested_by_idx ON public.orders(requested_by);
      CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
      
      RAISE NOTICE '✅ Created indexes';
      
      -- Create updated_at trigger
      CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS orders_updated_at_trigger ON public.orders;
      CREATE TRIGGER orders_updated_at_trigger
        BEFORE UPDATE ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.update_orders_updated_at();
      
      RAISE NOTICE '✅ Created triggers';
      RAISE NOTICE '🎉 Migration complete!';
      
    ELSE
      RAISE NOTICE '⚠️  Orders table exists but missing amount column - structure unknown';
    END IF;
  ELSE
    RAISE NOTICE '✅ Amount column exists - table structure looks good';
  END IF;
END $$;

-- Step 3: Verify the fix
SELECT 
  'Verification - orders table columns after fix:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Step 4: Show RLS policies
SELECT 
  'RLS Policies on orders table:' as info,
  policyname,
  cmd as command,
  permissive
FROM pg_policies 
WHERE tablename = 'orders';

-- Step 5: Test insert capability
SELECT 
  'Ready to test!' as status,
  'Try creating an order now from the app' as next_step;
