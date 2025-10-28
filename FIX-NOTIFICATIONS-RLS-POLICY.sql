-- ============================================================================
-- FIX NOTIFICATIONS RLS INSERT POLICY
-- Allow authenticated users to create notifications for any user
-- ============================================================================

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create a more permissive INSERT policy
-- This allows any authenticated user to create notifications for other users
CREATE POLICY "Authenticated users can create notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Verify the policy
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'notifications'
AND cmd = 'INSERT'
ORDER BY policyname;

SELECT '✅ Notifications INSERT policy updated!' as status;
