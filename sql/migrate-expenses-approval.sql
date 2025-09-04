-- Migration to add expense approval workflow columns
-- This extends the existing expenses table to support both job-based expenses and general company expenses

-- Add new columns for expense approval workflow
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('labor', 'materials', 'rentals', 'other')),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Make job_id optional for general company expenses (not tied to specific jobs)
ALTER TABLE public.expenses ALTER COLUMN job_id DROP NOT NULL;

-- Update indexes to support new queries
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_created_by_idx ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses(category);
CREATE INDEX IF NOT EXISTS expenses_company_status_idx ON public.expenses(company_id, status);

-- Add updated_at column and trigger for audit trail
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

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

-- Update RLS policy to support both job-based and user-based access
DROP POLICY IF EXISTS expenses_rls ON public.expenses;

-- Create separate policies for different access patterns
CREATE POLICY expenses_select_own ON public.expenses 
  FOR SELECT USING (
    company_id = public.auth_company_id() AND 
    (user_id = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY expenses_select_admin ON public.expenses 
  FOR SELECT USING (
    company_id = public.auth_company_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.company_id = public.auth_company_id()
      AND p.role IN ('admin', 'owner', 'bookkeeper')
    )
  );

CREATE POLICY expenses_insert_authenticated ON public.expenses 
  FOR INSERT WITH CHECK (
    company_id = public.auth_company_id() AND
    (user_id = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY expenses_update_admin ON public.expenses 
  FOR UPDATE USING (
    company_id = public.auth_company_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.company_id = public.auth_company_id()
      AND p.role IN ('admin', 'owner', 'bookkeeper')
    )
  );

-- No delete policy - expenses should be soft-deleted or archived
CREATE POLICY expenses_no_delete ON public.expenses 
  FOR DELETE USING (false);

-- Ensure we have the auth_company_id function
CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS uuid 
LANGUAGE sql 
SECURITY DEFINER
STABLE
AS $$
  SELECT p.company_id 
  FROM public.profiles p 
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- Set default values for new workflow columns on existing records
UPDATE public.expenses 
SET 
  status = 'approved',
  user_id = created_by,
  vendor = COALESCE(memo, 'Unknown Vendor'),
  category = 'other',
  notes = memo
WHERE status IS NULL;

-- Create function to handle expense approval
CREATE OR REPLACE FUNCTION public.approve_expense(
  expense_id uuid,
  action text,
  review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user has permission to approve expenses
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.company_id = public.auth_company_id()
    AND p.role IN ('admin', 'owner', 'bookkeeper')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve expenses';
  END IF;

  -- Verify expense exists and belongs to user's company
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id 
    AND e.company_id = public.auth_company_id()
  ) THEN
    RAISE EXCEPTION 'Expense not found or access denied';
  END IF;

  -- Update expense status
  UPDATE public.expenses
  SET 
    status = CASE WHEN action = 'approve' THEN 'approved' ELSE 'rejected' END,
    approved_by = auth.uid(),
    approved_at = now(),
    approval_notes = review_notes,
    updated_at = now()
  WHERE id = expense_id;

  -- Log the approval action in events table
  INSERT INTO public.events (
    company_id,
    actor_id,
    entity,
    entity_id,
    verb,
    payload
  )
  SELECT 
    e.company_id,
    auth.uid(),
    'expense',
    expense_id,
    action || '_expense',
    jsonb_build_object(
      'expense_id', expense_id,
      'action', action,
      'notes', review_notes,
      'amount', e.amount,
      'vendor', e.vendor
    )
  FROM public.expenses e
  WHERE e.id = expense_id;
END;
$$;
