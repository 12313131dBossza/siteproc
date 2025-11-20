-- ADD-SUBMITTED-BY-TO-EXPENSES.sql
-- Purpose: Add submitted_by column to expenses table for notification triggers
-- This column is required for expense approval notifications to work

BEGIN;

-- Add submitted_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
    AND table_name='expenses' 
    AND column_name='submitted_by'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN submitted_by uuid REFERENCES auth.users(id);
    RAISE NOTICE '✅ Added submitted_by column to expenses table';
  ELSE
    RAISE NOTICE 'ℹ️ submitted_by column already exists';
  END IF;
END $$;

-- Backfill submitted_by from user_id for existing expenses
UPDATE public.expenses 
SET submitted_by = user_id 
WHERE submitted_by IS NULL AND user_id IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON public.expenses(submitted_by);

COMMIT;

-- Verify the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'expenses'
  AND column_name = 'submitted_by';
