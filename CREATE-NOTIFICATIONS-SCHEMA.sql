-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION SYSTEM - DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- This creates the notifications table and sets up real-time subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ========================================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'order_approved', 'order_rejected', 'expense_approved', 'delivery_confirmed', 'budget_warning'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL to navigate to when clicked
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT notifications_type_check CHECK (type IN (
        'order_created',
        'order_approved',
        'order_rejected',
        'expense_created',
        'expense_approved',
        'expense_rejected',
        'delivery_created',
        'delivery_confirmed',
        'budget_warning',
        'budget_exceeded',
        'project_created',
        'project_updated'
    ))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ========================================================================
-- 2. ENABLE RLS ON NOTIFICATIONS
-- ========================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- System can insert notifications for users
CREATE POLICY notifications_insert_policy ON notifications
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_policy ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY notifications_delete_policy ON notifications
    FOR DELETE
    USING (user_id = auth.uid());

-- ========================================================================
-- 3. CREATE NOTIFICATION PREFERENCES TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email notifications
    email_order_approved BOOLEAN DEFAULT TRUE,
    email_order_rejected BOOLEAN DEFAULT TRUE,
    email_expense_approved BOOLEAN DEFAULT TRUE,
    email_expense_rejected BOOLEAN DEFAULT TRUE,
    email_delivery_confirmed BOOLEAN DEFAULT TRUE,
    email_budget_warning BOOLEAN DEFAULT TRUE,
    email_budget_exceeded BOOLEAN DEFAULT TRUE,
    
    -- In-app notifications
    app_order_approved BOOLEAN DEFAULT TRUE,
    app_order_rejected BOOLEAN DEFAULT TRUE,
    app_expense_approved BOOLEAN DEFAULT TRUE,
    app_expense_rejected BOOLEAN DEFAULT TRUE,
    app_delivery_confirmed BOOLEAN DEFAULT TRUE,
    app_budget_warning BOOLEAN DEFAULT TRUE,
    app_budget_exceeded BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_policy ON notification_preferences
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert_policy ON notification_preferences
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update_policy ON notification_preferences
    FOR UPDATE
    USING (user_id = auth.uid());

-- ========================================================================
-- 4. CREATE FUNCTION TO AUTO-CREATE PREFERENCES FOR NEW USERS
-- ========================================================================

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table (when user is created)
DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON profiles;
CREATE TRIGGER create_notification_preferences_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- ========================================================================
-- 5. CREATE HELPER FUNCTION TO SEND NOTIFICATIONS
-- ========================================================================

CREATE OR REPLACE FUNCTION send_notification(
    p_user_id UUID,
    p_company_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, company_id, type, title, message, link)
    VALUES (p_user_id, p_company_id, p_type, p_title, p_message, p_link)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 6. ENABLE REALTIME FOR NOTIFICATIONS
-- ========================================================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

COMMIT;

-- ========================================================================
-- 7. VERIFICATION
-- ========================================================================

SELECT '════════════════════════════════════════════════' as separator;
SELECT '✅✅✅ NOTIFICATION SYSTEM SETUP COMPLETE! ✅✅✅' as status;
SELECT '════════════════════════════════════════════════' as separator;

-- Check tables exist
SELECT 
    '📋 TABLES CREATED' as check_type,
    COUNT(*) FILTER (WHERE table_name = 'notifications') as has_notifications,
    COUNT(*) FILTER (WHERE table_name = 'notification_preferences') as has_preferences,
    CASE 
        WHEN COUNT(*) FILTER (WHERE table_name IN ('notifications', 'notification_preferences')) = 2
        THEN '✅ ALL TABLES CREATED'
        ELSE '❌ MISSING TABLES'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'notification_preferences');

-- Check RLS is enabled
SELECT 
    '🔒 RLS STATUS' as check_type,
    COUNT(*) FILTER (WHERE tablename = 'notifications' AND rowsecurity = true) as notifications_rls,
    COUNT(*) FILTER (WHERE tablename = 'notification_preferences' AND rowsecurity = true) as preferences_rls,
    CASE 
        WHEN COUNT(*) FILTER (WHERE rowsecurity = true) = 2
        THEN '✅ RLS ENABLED'
        ELSE '❌ RLS NOT ENABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'notification_preferences');

SELECT '════════════════════════════════════════════════' as separator;
SELECT '📝 NEXT: Deploy notification UI components' as instruction;
SELECT '════════════════════════════════════════════════' as separator;
