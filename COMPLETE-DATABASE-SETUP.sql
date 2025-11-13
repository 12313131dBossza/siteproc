-- ============================================================================
-- COMPLETE DATABASE SETUP FOR SITEPROC PRODUCTION
-- Run this AFTER project is resumed from pause
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD USERNAME COLUMNS (from username auth migration)
-- ============================================================================

-- Add username column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
    RAISE NOTICE '✅ Added username column to profiles table';
  ELSE
    RAISE NOTICE 'ℹ️ username column already exists';
  END IF;
END $$;

-- Add full_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE '✅ Added full_name column to profiles table';
  ELSE
    RAISE NOTICE 'ℹ️ full_name column already exists';
  END IF;
END $$;

-- Create unique index on username (case-insensitive)
DROP INDEX IF EXISTS profiles_username_unique_idx;
CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles (LOWER(username));

COMMENT ON COLUMN public.profiles.username IS 'Unique username for login (case-insensitive)';
COMMENT ON COLUMN public.profiles.full_name IS 'User display name';

-- ============================================================================
-- STEP 2: ENSURE COMPANIES TABLE EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 3: CREATE DEFAULT COMPANY IF NONE EXISTS
-- ============================================================================

INSERT INTO public.companies (id, name)
SELECT '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid, 'Default Company'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid);

-- ============================================================================
-- STEP 4: FIX ALL EXISTING PROFILES - ASSIGN TO DEFAULT COMPANY
-- ============================================================================

-- Update all profiles without company_id
UPDATE public.profiles 
SET company_id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::uuid
WHERE company_id IS NULL;

-- Ensure all profiles have a role
UPDATE public.profiles 
SET role = 'admin'
WHERE role IS NULL;

-- Generate usernames for existing profiles if missing
UPDATE public.profiles 
SET username = LOWER(REPLACE(split_part(email, '@', 1), '.', '_'))
WHERE username IS NULL AND email IS NOT NULL;

-- Set full_name from email if missing
UPDATE public.profiles 
SET full_name = split_part(email, '@', 1)
WHERE full_name IS NULL AND email IS NOT NULL;

-- ============================================================================
-- STEP 5: VERIFY DATA
-- ============================================================================

SELECT 
  '✅ COMPANIES' as check_type,
  COUNT(*) as count
FROM public.companies;

SELECT 
  '✅ PROFILES' as check_type,
  id,
  email,
  username,
  full_name,
  role,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '❌ NO COMPANY'
    ELSE '✅ HAS COMPANY'
  END as status
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 6: ENSURE ESSENTIAL TABLES EXIST
-- ============================================================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  budget NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table (purchase orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  order_number TEXT,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  order_id UUID REFERENCES public.orders(id),
  delivery_date DATE,
  status TEXT DEFAULT 'pending',
  driver_name TEXT,
  vehicle_number TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'pieces',
  unit_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  description TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  expense_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  amount NUMERIC(12,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Companies policies
DROP POLICY IF EXISTS "companies_select_all" ON public.companies;
CREATE POLICY "companies_select_all" ON public.companies
  FOR SELECT USING (true);

-- Projects policies
DROP POLICY IF EXISTS "projects_select_own_company" ON public.projects;
CREATE POLICY "projects_select_own_company" ON public.projects
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "projects_insert_own_company" ON public.projects;
CREATE POLICY "projects_insert_own_company" ON public.projects
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Orders policies
DROP POLICY IF EXISTS "orders_select_own_company" ON public.orders;
CREATE POLICY "orders_select_own_company" ON public.orders
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_insert_own_company" ON public.orders;
CREATE POLICY "orders_insert_own_company" ON public.orders
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Deliveries policies
DROP POLICY IF EXISTS "deliveries_select_own_company" ON public.deliveries;
CREATE POLICY "deliveries_select_own_company" ON public.deliveries
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "deliveries_insert_own_company" ON public.deliveries;
CREATE POLICY "deliveries_insert_own_company" ON public.deliveries
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Products policies
DROP POLICY IF EXISTS "products_select_own_company" ON public.products;
CREATE POLICY "products_select_own_company" ON public.products
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "products_insert_own_company" ON public.products;
CREATE POLICY "products_insert_own_company" ON public.products
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- STEP 9: FINAL VERIFICATION
-- ============================================================================

SELECT 
  '✅ FINAL CHECK' as status,
  (SELECT COUNT(*) FROM public.companies) as companies_count,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  (SELECT COUNT(*) FROM public.profiles WHERE company_id IS NULL) as profiles_without_company,
  (SELECT COUNT(*) FROM public.profiles WHERE username IS NULL) as profiles_without_username;

SELECT '✅ DATABASE SETUP COMPLETE!' as message;
