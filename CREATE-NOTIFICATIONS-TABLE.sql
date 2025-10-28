-- ============================================================================
-- PHASE 14: NOTIFICATIONS SYSTEM - DATABASE SCHEMA
-- Create notifications table and supporting infrastructure
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'order_approved',
        'order_rejected',
        'expense_approved',
        'expense_rejected',
        'delivery_status',
        'payment_created',
        'payment_updated',
        'project_update',
        'system'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_link CHECK (link IS NULL OR link ~ '^/.*')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Add table comment
COMMENT ON TABLE notifications IS 'User notifications for system events and updates';
COMMENT ON COLUMN notifications.type IS 'Type of notification: order_approved, order_rejected, expense_approved, expense_rejected, delivery_status, payment_created, payment_updated, project_update, system';
COMMENT ON COLUMN notifications.metadata IS 'Additional notification data in JSON format';
COMMENT ON COLUMN notifications.link IS 'Relative URL to navigate to when notification is clicked';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications
    FOR SELECT
    USING (
        auth.uid() = user_id
    );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
    ON notifications
    FOR DELETE
    USING (
        auth.uid() = user_id
    );

-- Policy: System/authenticated users can insert notifications
CREATE POLICY "System can insert notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_company_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        company_id,
        type,
        title,
        message,
        link,
        metadata,
        read,
        created_at
    ) VALUES (
        p_user_id,
        p_company_id,
        p_type,
        p_title,
        p_message,
        p_link,
        p_metadata,
        FALSE,
        NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification IS 'Create a new notification for a user';

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET read = TRUE,
        read_at = NOW()
    WHERE id = p_notification_id
      AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_notification_read IS 'Mark a notification as read';

-- Function to mark all notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE notifications
    SET read = TRUE,
        read_at = NOW()
    WHERE user_id = auth.uid()
      AND read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all unread notifications as read for current user';

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = auth.uid()
          AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications for current user';

-- Function to delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE read = TRUE
      AND read_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Delete read notifications older than specified days (default 90)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table exists
SELECT 'Notifications table created' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
);

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
ORDER BY indexname;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'notifications';

-- Check policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- Summary
SELECT '✅ Phase 14: Notifications Database Schema Complete!' as status;
SELECT 'Table: notifications' as component, 'Created with RLS policies' as status
UNION ALL
SELECT 'Indexes: 5', 'Performance optimized'
UNION ALL
SELECT 'Functions: 5', 'Helper functions for CRUD operations'
UNION ALL
SELECT 'Policies: 4', 'User-scoped RLS policies';
