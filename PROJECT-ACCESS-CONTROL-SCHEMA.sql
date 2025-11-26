-- PROJECT-ACCESS-CONTROL-SCHEMA.sql
-- Phase 1: Add project-level access control tables
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- Table 1: project_members
-- Controls who can access specific projects
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- For internal users (your company members)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- For external collaborators (clients/suppliers without account)
  external_email TEXT,
  external_name TEXT,
  external_company TEXT,
  external_type TEXT CHECK (external_type IN ('client', 'supplier', 'contractor', 'consultant', 'other')),
  
  -- Access control
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'editor', 'viewer', 'collaborator')),
  permissions JSONB DEFAULT '{
    "view_project": true,
    "view_orders": true,
    "view_expenses": false,
    "view_payments": false,
    "view_documents": true,
    "edit_project": false,
    "create_orders": false,
    "upload_documents": false,
    "invite_others": false
  }'::jsonb,
  
  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Ensure either user_id OR external_email is set, not both
  CONSTRAINT user_or_external CHECK (
    (user_id IS NOT NULL AND external_email IS NULL) OR
    (user_id IS NULL AND external_email IS NOT NULL)
  )
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_external_email ON public.project_members(external_email);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON public.project_members(status);
CREATE INDEX IF NOT EXISTS idx_project_members_invitation_token ON public.project_members(invitation_token);

-- Unique constraint: One user can only be added once per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique_user 
  ON public.project_members(project_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique_email 
  ON public.project_members(project_id, external_email) WHERE external_email IS NOT NULL;


-- ============================================
-- Table 2: project_settings (visibility & defaults)
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Visibility controls who can see the project
  visibility TEXT NOT NULL DEFAULT 'company' CHECK (visibility IN (
    'private',    -- Only owner and explicit project_members
    'company',    -- All company members (current default behavior)
    'team'        -- Only assigned project_members
  )),
  
  -- Default permissions for new members
  default_member_permissions JSONB DEFAULT '{
    "view_project": true,
    "view_orders": true,
    "view_expenses": false,
    "view_payments": false,
    "view_documents": true,
    "edit_project": false,
    "create_orders": false,
    "upload_documents": false,
    "invite_others": false
  }'::jsonb,
  
  -- External sharing settings
  allow_external_sharing BOOLEAN DEFAULT true,
  require_approval_for_external BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON public.project_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_settings_visibility ON public.project_settings(visibility);


-- ============================================
-- Add created_by to projects table if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN created_by UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added created_by column to projects';
  END IF;
END $$;


-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;


-- ============================================
-- RLS Policies for project_members
-- ============================================
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

-- Users can view project members if:
-- 1. They are a member of the project, OR
-- 2. The project belongs to their company
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    -- User is a member of this project
    user_id = auth.uid()
    OR
    -- User belongs to the company that owns the project
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid()
    )
  );

-- Project managers and company admins can add members
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (
    -- User is admin/owner in the company that owns the project
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'owner', 'manager')
    )
    OR
    -- User is a project owner/manager
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'manager')
      AND pm.status = 'active'
    )
  );

-- Similar for update and delete
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'owner')
    )
  );


-- ============================================
-- RLS Policies for project_settings
-- ============================================
DROP POLICY IF EXISTS "project_settings_select" ON public.project_settings;
DROP POLICY IF EXISTS "project_settings_insert" ON public.project_settings;
DROP POLICY IF EXISTS "project_settings_update" ON public.project_settings;

CREATE POLICY "project_settings_select" ON public.project_settings
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "project_settings_insert" ON public.project_settings
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "project_settings_update" ON public.project_settings
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.company_id = p.company_id
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'owner', 'manager')
    )
  );


-- ============================================
-- Trigger: Auto-create project_settings for new projects
-- ============================================
CREATE OR REPLACE FUNCTION public.create_project_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.project_settings (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_project_settings ON public.projects;
CREATE TRIGGER trg_create_project_settings
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_project_settings();


-- ============================================
-- Trigger: Auto-add project creator as owner
-- ============================================
CREATE OR REPLACE FUNCTION public.add_project_creator_as_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only if created_by is set
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role, status, permissions)
    VALUES (
      NEW.id, 
      NEW.created_by, 
      'owner', 
      'active',
      '{
        "view_project": true,
        "view_orders": true,
        "view_expenses": true,
        "view_payments": true,
        "view_documents": true,
        "edit_project": true,
        "create_orders": true,
        "upload_documents": true,
        "invite_others": true
      }'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_project_creator ON public.projects;
CREATE TRIGGER trg_add_project_creator
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.add_project_creator_as_owner();


-- ============================================
-- Updated_at triggers
-- ============================================
DROP TRIGGER IF EXISTS trg_project_members_updated_at ON public.project_members;
CREATE TRIGGER trg_project_members_updated_at
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_project_settings_updated_at ON public.project_settings;
CREATE TRIGGER trg_project_settings_updated_at
  BEFORE UPDATE ON public.project_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================
-- Helper function: Check if user can access project
-- ============================================
CREATE OR REPLACE FUNCTION public.can_access_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_visibility TEXT;
  v_company_id UUID;
  v_user_company_id UUID;
BEGIN
  -- Get project visibility and company
  SELECT ps.visibility, p.company_id 
  INTO v_visibility, v_company_id
  FROM public.projects p
  LEFT JOIN public.project_settings ps ON ps.project_id = p.id
  WHERE p.id = p_project_id;
  
  -- Get user's company
  SELECT company_id INTO v_user_company_id
  FROM public.profiles WHERE id = p_user_id;
  
  -- Check based on visibility
  CASE v_visibility
    WHEN 'company' THEN
      -- All company members can access
      RETURN v_company_id = v_user_company_id;
      
    WHEN 'private', 'team' THEN
      -- Only explicit members can access
      RETURN EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p_project_id
        AND pm.user_id = p_user_id
        AND pm.status = 'active'
      );
      
    ELSE
      -- Default to company visibility
      RETURN v_company_id = v_user_company_id;
  END CASE;
END;
$$;


-- ============================================
-- Initialize settings for existing projects
-- ============================================
INSERT INTO public.project_settings (project_id, visibility)
SELECT id, 'company' FROM public.projects
WHERE id NOT IN (SELECT project_id FROM public.project_settings)
ON CONFLICT (project_id) DO NOTHING;


-- ============================================
-- Verify setup
-- ============================================
SELECT 'project_members table' as table_name, COUNT(*) as count FROM public.project_members
UNION ALL
SELECT 'project_settings table', COUNT(*) FROM public.project_settings
UNION ALL
SELECT 'projects with settings', COUNT(*) FROM public.projects p 
  JOIN public.project_settings ps ON p.id = ps.project_id;

COMMIT;
