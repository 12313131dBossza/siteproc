-- FIX-PROJECT-MEMBERS-RLS.sql
-- Fix infinite recursion in project_members RLS policies
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- Drop existing problematic policies
-- ============================================
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

-- ============================================
-- Create a SECURITY DEFINER function to check permissions
-- This avoids RLS recursion by bypassing RLS
-- ============================================
DROP FUNCTION IF EXISTS public.can_manage_project_members(UUID);
CREATE OR REPLACE FUNCTION public.can_manage_project_members(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_project_company_id UUID;
  v_user_company_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's company and role
  SELECT company_id, role INTO v_user_company_id, v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  -- Get project's company
  SELECT company_id INTO v_project_company_id
  FROM public.projects
  WHERE id = p_project_id;

  -- User must be in the same company as the project
  IF v_user_company_id IS NULL OR v_project_company_id IS NULL OR v_user_company_id != v_project_company_id THEN
    RETURN FALSE;
  END IF;

  -- Check if user has admin/owner/manager role in company
  IF v_user_role IN ('admin', 'owner', 'manager') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is project owner/manager (direct query, no RLS)
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
    AND user_id = v_user_id
    AND role IN ('owner', 'manager')
    AND status = 'active'
  );
END;
$$;

-- ============================================
-- Function to check if user can view project members
-- ============================================
DROP FUNCTION IF EXISTS public.can_view_project_members(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_view_project_members(UUID);
CREATE OR REPLACE FUNCTION public.can_view_project_members(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_company_id UUID;
  v_user_company_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's company
  SELECT company_id INTO v_user_company_id
  FROM public.profiles
  WHERE id = v_user_id;

  -- Get project's company
  SELECT company_id INTO v_project_company_id
  FROM public.projects
  WHERE id = p_project_id;

  -- User can see members if they belong to the project's company
  RETURN v_user_company_id IS NOT NULL 
    AND v_project_company_id IS NOT NULL 
    AND v_user_company_id = v_project_company_id;
END;
$$;

-- ============================================
-- New RLS Policies (using helper functions)
-- ============================================

-- SELECT: Users can view project members if they're in the same company
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    public.can_view_project_members(project_id)
  );

-- INSERT: Only company admins/owners/managers or project owners/managers can add
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (
    public.can_manage_project_members(project_id)
  );

-- UPDATE: Only company admins/owners/managers can update
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    public.can_manage_project_members(project_id)
  );

-- DELETE: Only company admins/owners can delete
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    public.can_manage_project_members(project_id)
  );

-- ============================================
-- Verify policies
-- ============================================
SELECT 
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'project_members';

COMMIT;
