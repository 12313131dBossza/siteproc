-- ============================================================================
-- FIX NOTIFICATIONS TABLE - ADD MISSING METADATA COLUMN
-- ============================================================================

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN notifications.metadata IS 'Additional notification data in JSON format';
    END IF;
END $$;

-- Also add read_at column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read';
    END IF;
END $$;

-- Verify columns exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

SELECT '✅ Notifications table updated with missing columns!' as status;
