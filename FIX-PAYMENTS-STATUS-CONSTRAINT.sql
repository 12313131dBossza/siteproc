-- Fix payments status constraint to allow 'partial' status
-- This fixes the error: new row for relation "payments" violates check constraint "payments_status_check"

-- Drop the old constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Add new constraint with 'partial' status included
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('unpaid', 'pending', 'partial', 'paid', 'cancelled', 'failed'));

-- Verify the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'payments_status_check';
