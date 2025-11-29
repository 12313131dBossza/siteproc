-- ADD-PROJECT-MILESTONES.sql
-- Creates the project_milestones table for tracking project timeline checkpoints
-- Run this in Supabase SQL Editor

-- First, create helper function for RLS policies
CREATE OR REPLACE FUNCTION public.profile_company_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create milestones table
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  -- Optional links to related entities
  linked_delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  linked_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  linked_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  -- Auto-complete triggers
  auto_complete_on VARCHAR(50), -- 'all_orders_delivered', 'all_payments_approved', 'delivery_complete', etc.
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_company ON public.project_milestones(company_id);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON public.project_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON public.project_milestones(completed);

-- Enable RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Company members can view their company's milestones
CREATE POLICY milestones_select ON public.project_milestones
  FOR SELECT TO authenticated
  USING (company_id = public.profile_company_id(auth.uid()));

-- Company members can insert milestones
CREATE POLICY milestones_insert ON public.project_milestones
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.profile_company_id(auth.uid()));

-- Company members can update their milestones
CREATE POLICY milestones_update ON public.project_milestones
  FOR UPDATE TO authenticated
  USING (company_id = public.profile_company_id(auth.uid()));

-- Company members can delete their milestones
CREATE POLICY milestones_delete ON public.project_milestones
  FOR DELETE TO authenticated
  USING (company_id = public.profile_company_id(auth.uid()));

-- Create default "Project Started" milestone for existing projects
INSERT INTO public.project_milestones (project_id, company_id, name, description, target_date, completed, completed_at, sort_order)
SELECT 
  p.id,
  p.company_id,
  'Project Started',
  'Project kickoff and initial setup',
  p.created_at::date,
  TRUE,
  p.created_at,
  0
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_milestones pm 
  WHERE pm.project_id = p.id AND pm.name = 'Project Started'
);

-- Function to auto-create "Project Started" milestone for new projects
CREATE OR REPLACE FUNCTION public.create_project_started_milestone()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_milestones (
    project_id, 
    company_id, 
    name, 
    description, 
    target_date, 
    completed, 
    completed_at, 
    sort_order,
    created_by
  ) VALUES (
    NEW.id,
    NEW.company_id,
    'Project Started',
    'Project kickoff and initial setup',
    CURRENT_DATE,
    TRUE,
    NOW(),
    0,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create milestone on new project
DROP TRIGGER IF EXISTS trigger_create_project_milestone ON public.projects;
CREATE TRIGGER trigger_create_project_milestone
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_project_started_milestone();

-- Done!
SELECT 'project_milestones table created with RLS policies' AS status;
