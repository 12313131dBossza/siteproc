-- ============================================================================
-- UPDATE ACTIVITY LOG ENUM FOR PHASE 2
-- Adds client, contractor, and bid types to activity_type enum
-- ============================================================================

-- Add new values to activity_type enum
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'contractor';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'bid';

-- Verify the enum has all values
SELECT 
  enumlabel as activity_type_value,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'activity_type'::regtype
ORDER BY enumsortorder;

-- Test inserting activity for client
-- INSERT INTO activity_logs (type, action, description, user_id, company_id)
-- VALUES ('client', 'created', 'Test client activity', auth.uid(), (SELECT company_id FROM profiles WHERE id = auth.uid()));
