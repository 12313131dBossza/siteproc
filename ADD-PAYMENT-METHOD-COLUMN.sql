-- Add payment_method column to expenses table
-- This stores the user-selected payment method (Petty Cash, Bank Transfer, Credit Card, etc.)

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

COMMENT ON COLUMN expenses.payment_method IS 'User-selected payment method: petty_cash, bank_transfer, credit_card, cash, check, other';
