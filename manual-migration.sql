-- Direct SQL to run on database
-- Adding workflow columns step by step

-- Step 1: Add basic workflow columns
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approval_notes text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 2: Add check constraint for status
ALTER TABLE public.expenses ADD CONSTRAINT IF NOT EXISTS expenses_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Step 3: Add indexes
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);
CREATE INDEX IF NOT EXISTS expenses_company_status_idx ON public.expenses(company_id, status);

-- Step 4: Update existing records
UPDATE public.expenses SET status = 'approved', updated_at = now() WHERE status IS NULL OR status = '';

-- Step 5: Simple RLS policy that allows service role
DROP POLICY IF EXISTS expenses_service_access ON public.expenses;
CREATE POLICY expenses_service_access ON public.expenses FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
