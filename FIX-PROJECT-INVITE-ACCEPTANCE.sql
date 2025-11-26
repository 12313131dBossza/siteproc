-- FIX-PROJECT-INVITE-ACCEPTANCE.sql
-- Allow users to accept their own project invitations
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- Function to check if user can accept an invitation
-- This allows a user to update ONLY their own pending invitation
-- ============================================
CREATE OR REPLACE FUNCTION public.can_accept_project_invitation(
  p_member_id UUID,
  p_invitation_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
BEGIN
  -- Get the member record
  SELECT * INTO v_member
  FROM public.project_members
  WHERE id = p_member_id;

  -- Must exist and be pending
  IF v_member IS NULL OR v_member.status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- Must have matching token
  IF v_member.invitation_token IS NULL OR v_member.invitation_token != p_invitation_token THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================
-- Update the UPDATE policy to also allow invitation acceptance
-- ============================================
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;

CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    -- Company admins/managers can update
    public.can_manage_project_members(project_id)
    OR
    -- Users can accept their own pending invitations (checked via token in API)
    (status = 'pending' AND invitation_token IS NOT NULL)
  );

-- ============================================
-- Also allow SELECT on pending invitations by token
-- This is needed to look up the invitation before accepting
-- ============================================
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    -- Company members can view
    public.can_view_project_members(project_id)
    OR
    -- Anyone can view pending invitations (for acceptance flow)
    (status = 'pending' AND invitation_token IS NOT NULL)
  );

-- ============================================
-- Verify policies
-- ============================================
SELECT 
  policyname, 
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'project_members';

COMMIT;
