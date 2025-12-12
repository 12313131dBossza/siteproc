-- ============================================================
-- ADD DELAY SHIELD ACTIONS TO activity_action ENUM
-- Run this in Supabase SQL Editor to add new action types
-- ============================================================

-- Add 'delay_shield_applied' to the enum
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'delay_shield_applied';

-- Add 'delay_shield_dismissed' to the enum  
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'delay_shield_dismissed';

-- Verify the enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'activity_action'::regtype ORDER BY enumlabel;

-- ============================================================
-- After running this, you can use 'delay_shield_applied' action
-- ============================================================
