-- Clean Expense Workflow Migration for Supabase
-- Run this in Supabase SQL Editor

-- Step 1: Add workflow columns (safe with IF NOT EXISTS)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approval_notes text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 2: Update existing records FIRST (before adding constraint)
UPDATE public.expenses 
SET 
  status = 'approved',
  updated_at = now()
WHERE status IS NULL OR status = '' OR status NOT IN ('pending', 'approved', 'rejected');

-- Step 3: Now add status constraint (after data is clean)
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);
CREATE INDEX IF NOT EXISTS expenses_company_status_idx ON public.expenses(company_id, status);

-- Step 6: Add updated_at trigger
CREATE OR REPLACE FUNCTION public.expenses_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at 
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW 
  EXECUTE PROCEDURE public.expenses_set_updated_at();

-- Step 7: Simple RLS policy (allows service role full access)
DROP POLICY IF EXISTS expenses_service_access ON public.expenses;
CREATE POLICY expenses_service_access ON public.expenses 
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
