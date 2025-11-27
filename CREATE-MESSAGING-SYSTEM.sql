-- CREATE-MESSAGING-SYSTEM.sql
-- Complete messaging system with visibility rules:
-- - Company ↔ Supplier: Visible only to Company + Supplier
-- - Company ↔ Client: Visible only to Company + Client  
-- - Supplier ↔ Client: BLOCKED (prevents direct negotiation)
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================
-- Drop old table if exists and recreate with new structure
-- ============================================
DROP TABLE IF EXISTS public.project_messages CASCADE;

-- ============================================
-- Messages Table with channel support
-- ============================================
CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Sender info
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('company', 'supplier', 'client')),
  
  -- Channel determines who can see the message
  -- 'company_supplier' = only company and supplier can see
  -- 'company_client' = only company and client can see
  channel TEXT NOT NULL CHECK (channel IN ('company_supplier', 'company_client')),
  
  -- For supplier messages, link to which delivery/order they're working on
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  
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
CREATE INDEX idx_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_messages_sender_id ON public.project_messages(sender_id);
CREATE INDEX idx_messages_channel ON public.project_messages(channel);
CREATE INDEX idx_messages_delivery_id ON public.project_messages(delivery_id);
CREATE INDEX idx_messages_created_at ON public.project_messages(created_at DESC);
CREATE INDEX idx_messages_unread ON public.project_messages(project_id, channel, is_read) WHERE is_read = FALSE;

-- ============================================
-- Supplier Assignments Table
-- Links suppliers to specific deliveries/orders they're responsible for
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure supplier is assigned to at least one thing
  CONSTRAINT supplier_has_assignment CHECK (
    delivery_id IS NOT NULL OR order_id IS NOT NULL OR project_id IS NOT NULL
  )
);

CREATE INDEX idx_supplier_assignments_supplier ON public.supplier_assignments(supplier_id);
CREATE INDEX idx_supplier_assignments_delivery ON public.supplier_assignments(delivery_id);
CREATE INDEX idx_supplier_assignments_project ON public.supplier_assignments(project_id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: Check if user is supplier for this project/delivery
-- ============================================
CREATE OR REPLACE FUNCTION public.is_supplier_for_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.supplier_assignments sa
    WHERE sa.supplier_id = p_user_id
    AND (sa.project_id = p_project_id OR sa.project_id IS NULL)
    AND sa.status = 'active'
  );
END;
$$;

-- ============================================
-- Helper function: Check if user is client for this project
-- ============================================
CREATE OR REPLACE FUNCTION public.is_client_for_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = p_user_id
    AND pm.project_id = p_project_id
    AND pm.status = 'active'
    AND pm.role IN ('viewer', 'client')
  );
END;
$$;

-- ============================================
-- Helper function: Check if user is company member
-- ============================================
CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
    AND p.company_id = p_company_id
    AND p.role IN ('admin', 'owner', 'manager', 'bookkeeper', 'member')
  );
END;
$$;

-- ============================================
-- Messages RLS Policies
-- ============================================

-- SELECT: Users can only see messages in channels they belong to
CREATE POLICY "messages_select" ON public.project_messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      -- Company members see both channels
      public.is_company_member(company_id, auth.uid())
      OR
      -- Suppliers only see company_supplier channel
      (channel = 'company_supplier' AND public.is_supplier_for_project(project_id, auth.uid()))
      OR
      -- Clients only see company_client channel
      (channel = 'company_client' AND public.is_client_for_project(project_id, auth.uid()))
    )
  );

-- INSERT: Enforce channel rules on insert
CREATE POLICY "messages_insert" ON public.project_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Company can send to any channel
      (public.is_company_member(company_id, auth.uid()))
      OR
      -- Suppliers can only send to company_supplier channel
      (sender_type = 'supplier' AND channel = 'company_supplier' AND public.is_supplier_for_project(project_id, auth.uid()))
      OR
      -- Clients can only send to company_client channel
      (sender_type = 'client' AND channel = 'company_client' AND public.is_client_for_project(project_id, auth.uid()))
    )
  );

-- UPDATE: Own messages or mark as read
CREATE POLICY "messages_update" ON public.project_messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR public.is_company_member(company_id, auth.uid())
    OR (channel = 'company_supplier' AND public.is_supplier_for_project(project_id, auth.uid()))
    OR (channel = 'company_client' AND public.is_client_for_project(project_id, auth.uid()))
  );

-- DELETE: Only sender
CREATE POLICY "messages_delete" ON public.project_messages
  FOR DELETE USING (sender_id = auth.uid());

-- ============================================
-- Supplier Assignments RLS
-- ============================================
CREATE POLICY "supplier_assignments_select" ON public.supplier_assignments
  FOR SELECT USING (
    -- Company members can see all
    public.is_company_member(company_id, auth.uid())
    OR
    -- Suppliers can see their own assignments
    supplier_id = auth.uid()
  );

CREATE POLICY "supplier_assignments_insert" ON public.supplier_assignments
  FOR INSERT WITH CHECK (
    public.is_company_member(company_id, auth.uid())
  );

CREATE POLICY "supplier_assignments_update" ON public.supplier_assignments
  FOR UPDATE USING (
    public.is_company_member(company_id, auth.uid())
  );

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_messages_updated_at();

CREATE TRIGGER supplier_assignments_updated_at
  BEFORE UPDATE ON public.supplier_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_messages_updated_at();

-- ============================================
-- Add supplier role to profiles if not exists
-- ============================================
DO $$
BEGIN
  -- Check if 'supplier' is already in the role constraint
  -- If profiles table exists and has role column, we're good
  -- The role field is already TEXT so it can hold 'supplier'
  NULL;
END $$;

COMMIT;
