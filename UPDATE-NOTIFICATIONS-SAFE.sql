-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION SYSTEM - SAFE UPDATE
-- ═══════════════════════════════════════════════════════════════════════════
-- This safely updates the notifications system without recreating existing tables
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ========================================================================
-- 1. VERIFY NOTIFICATIONS TABLE EXISTS
-- ========================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            
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
        RAISE NOTICE '✅ Created notifications table';
    ELSE
        RAISE NOTICE '✅ Notifications table already exists';
    END IF;
END $$;

-- ========================================================================
-- 2. CREATE INDEXES IF NOT EXISTS
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ========================================================================
-- 3. ENABLE RLS ON NOTIFICATIONS
-- ========================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy ON notifications
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_delete_policy ON notifications;
CREATE POLICY notifications_delete_policy ON notifications
    FOR DELETE
    USING (user_id = auth.uid());

-- ========================================================================
-- 4. VERIFY NOTIFICATION PREFERENCES TABLE
-- ========================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        CREATE TABLE notification_preferences (
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
        RAISE NOTICE '✅ Created notification_preferences table';
    ELSE
        RAISE NOTICE '✅ Notification preferences table already exists';
    END IF;
END $$;

-- ========================================================================
-- 5. ENABLE RLS ON NOTIFICATION PREFERENCES
-- ========================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_select_policy ON notification_preferences;
CREATE POLICY notification_preferences_select_policy ON notification_preferences
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_insert_policy ON notification_preferences;
CREATE POLICY notification_preferences_insert_policy ON notification_preferences
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_update_policy ON notification_preferences;
CREATE POLICY notification_preferences_update_policy ON notification_preferences
    FOR UPDATE
    USING (user_id = auth.uid());

-- ========================================================================
-- 6. CREATE/UPDATE NOTIFICATION PREFERENCES FUNCTION
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

-- ========================================================================
-- 7. CREATE/UPDATE TRIGGER
-- ========================================================================

DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON profiles;
CREATE TRIGGER create_notification_preferences_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- ========================================================================
-- 8. CREATE/UPDATE SEND NOTIFICATION FUNCTION
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
-- 9. ENABLE REALTIME FOR NOTIFICATIONS
-- ========================================================================

-- Try to add table to realtime publication (may already be added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    RAISE NOTICE '✅ Added notifications to realtime publication';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '✅ Notifications already in realtime publication';
END $$;

COMMIT;

-- ========================================================================
-- 10. VERIFICATION
-- ========================================================================

SELECT '════════════════════════════════════════════════' as separator;
SELECT '✅✅✅ NOTIFICATION SYSTEM UPDATE COMPLETE! ✅✅✅' as status;
SELECT '════════════════════════════════════════════════' as separator;

-- Check tables exist
SELECT 
    '📋 TABLES STATUS' as check_type,
    COUNT(*) FILTER (WHERE table_name = 'notifications') as has_notifications,
    COUNT(*) FILTER (WHERE table_name = 'notification_preferences') as has_preferences,
    CASE 
        WHEN COUNT(*) FILTER (WHERE table_name IN ('notifications', 'notification_preferences')) = 2
        THEN '✅ ALL TABLES EXIST'
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

-- Check policies exist
SELECT 
    '🛡️ POLICIES STATUS' as check_type,
    COUNT(*) FILTER (WHERE tablename = 'notifications') as notifications_policies,
    COUNT(*) FILTER (WHERE tablename = 'notification_preferences') as preferences_policies,
    CASE 
        WHEN COUNT(*) >= 7
        THEN '✅ ALL POLICIES CONFIGURED'
        ELSE '⚠️ CHECK POLICIES'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'notification_preferences');

-- Check current notification count
SELECT 
    '📊 DATA STATUS' as check_type,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = false) as unread_notifications,
    CASE 
        WHEN COUNT(*) > 0
        THEN '✅ HAS DATA'
        ELSE '📭 NO NOTIFICATIONS YET'
    END as status
FROM notifications;

SELECT '════════════════════════════════════════════════' as separator;
SELECT '🎉 Notification system is ready to use!' as instruction;
SELECT '📱 The NotificationBell component will now work!' as instruction;
SELECT '════════════════════════════════════════════════' as separator;
