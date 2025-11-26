-- FIX-INVITATION-RLS.sql
-- Run this in Supabase SQL Editor to fix the invitation link issue
-- The problem: Unauthenticated users can't read their invitation because RLS blocks them

-- Add policy to allow anyone to read pending invitations by token
DROP POLICY IF EXISTS "user_invitations_select_by_token" ON public.user_invitations;

CREATE POLICY "user_invitations_select_by_token" ON public.user_invitations
  FOR SELECT
  USING (
    status = 'pending' AND invitation_token IS NOT NULL
  );

-- Verify policy was created
SELECT 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_invitations';
