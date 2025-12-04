-- ADD-BILLING-COLUMNS.sql
-- Add Stripe billing columns to companies table
-- Run this in Supabase SQL Editor

BEGIN;

-- Add Stripe billing columns to companies table
DO $$
BEGIN
  -- Add stripe_customer_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT;
    RAISE NOTICE 'Added stripe_customer_id to companies';
  END IF;

  -- Add plan column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'plan'
  ) THEN
    ALTER TABLE companies ADD COLUMN plan TEXT DEFAULT 'free';
    RAISE NOTICE 'Added plan to companies';
  END IF;

  -- Add subscription_status column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE companies ADD COLUMN subscription_status TEXT;
    RAISE NOTICE 'Added subscription_status to companies';
  END IF;

  -- Add subscription_ends_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'subscription_ends_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN subscription_ends_at TIMESTAMPTZ;
    RAISE NOTICE 'Added subscription_ends_at to companies';
  END IF;

  -- Add billing_email column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE companies ADD COLUMN billing_email TEXT;
    RAISE NOTICE 'Added billing_email to companies';
  END IF;
END $$;

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id 
ON companies(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

COMMIT;

SELECT 'Billing columns added successfully!' as status;
