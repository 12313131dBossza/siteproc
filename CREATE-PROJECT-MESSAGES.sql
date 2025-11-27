-- CREATE-PROJECT-MESSAGES.sql
-- In-app messaging system for project communication between clients and company
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- Project Messages Table
-- Threaded messaging per project
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL,
  
  -- Optional file attachment
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  
  -- Thread support (reply to another message)
  parent_message_id UUID REFERENCES public.project_messages(id) ON DELETE SET NULL,
  
  -- Read tracking
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_sender_id ON public.project_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_created_at ON public.project_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_messages_parent_id ON public.project_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_unread ON public.project_messages(project_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- SELECT: Users can see messages for projects they have access to
CREATE POLICY "project_messages_select" ON public.project_messages
  FOR SELECT USING (
    -- Company members can view all messages for their company's projects
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = project_messages.company_id
      AND p.role IN ('admin', 'owner', 'manager', 'bookkeeper', 'member')
    )
    OR
    -- Project members (external viewers/clients) can view messages for their projects
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id = project_messages.project_id
      AND pm.status = 'active'
    )
  );

-- INSERT: Users can send messages to projects they have access to
CREATE POLICY "project_messages_insert" ON public.project_messages
  FOR INSERT WITH CHECK (
    -- Sender must be the authenticated user
    sender_id = auth.uid()
    AND
    (
      -- Company members can send messages
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = project_messages.company_id
        AND p.role IN ('admin', 'owner', 'manager', 'bookkeeper', 'member')
      )
      OR
      -- Project members can send messages
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.user_id = auth.uid()
        AND pm.project_id = project_messages.project_id
        AND pm.status = 'active'
      )
    )
  );

-- UPDATE: Users can update their own messages (edit) or mark messages as read
CREATE POLICY "project_messages_update" ON public.project_messages
  FOR UPDATE USING (
    -- Sender can edit their own message
    sender_id = auth.uid()
    OR
    -- Anyone with project access can mark messages as read
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = project_messages.company_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id = project_messages.project_id
      AND pm.status = 'active'
    )
  );

-- DELETE: Only sender can soft delete their messages
CREATE POLICY "project_messages_delete" ON public.project_messages
  FOR DELETE USING (
    sender_id = auth.uid()
  );

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_project_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_messages_updated_at ON public.project_messages;
CREATE TRIGGER project_messages_updated_at
  BEFORE UPDATE ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_messages_updated_at();

-- ============================================
-- Function to get unread message count
-- ============================================
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_project_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.project_messages
  WHERE project_id = p_project_id
    AND sender_id != p_user_id
    AND is_read = FALSE
    AND deleted_at IS NULL;
  
  RETURN v_count;
END;
$$;

-- ============================================
-- Verify table structure
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_messages'
ORDER BY ordinal_position;

COMMIT;
