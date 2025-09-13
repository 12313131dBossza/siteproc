-- Phase-1 Complete Database Schema
-- Run this in Supabase SQL Editor with postgres role
-- This creates the exact data model from the specification

-- Drop existing tables if they have incompatible structure
-- (Safe for development - in production, you'd migrate data)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Profiles table (matches auth.users.id)
CREATE TABLE profiles (
  id uuid PRIMARY KEY, -- same as auth.users.id
  company_id uuid NOT NULL REFERENCES companies(id),
  role text NOT NULL CHECK (role IN ('admin','member')),
  full_name text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  budget numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Completed','Archived')),
  created_at timestamptz DEFAULT now()
);

-- Orders table (new structure per spec)
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  project_id uuid NULL REFERENCES projects(id) ON DELETE SET NULL,
  sku text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  supplier text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected')),
  requested_by uuid NOT NULL REFERENCES profiles(id),
  decided_by uuid NULL REFERENCES profiles(id),
  decided_at timestamptz NULL,
  created_at timestamptz DEFAULT now()
);

-- Expenses table (updated structure per spec)
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  project_id uuid NULL REFERENCES projects(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('Labor','Materials','Rentals','Other')),
  vendor text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by uuid NOT NULL REFERENCES profiles(id),
  decided_by uuid NULL REFERENCES profiles(id),
  decided_at timestamptz NULL,
  spend_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Deliveries table (updated structure per spec)
CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  project_id uuid NULL REFERENCES projects(id) ON DELETE SET NULL,
  item text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  supplier text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received')),
  photo_url text NULL,
  logged_by uuid NOT NULL REFERENCES profiles(id),
  confirmed_by uuid NULL REFERENCES profiles(id),
  confirmed_at timestamptz NULL,
  delivered_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Activity logs table
CREATE TABLE activity_logs (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL,
  actor_id uuid NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('order','expense','delivery','project')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_companies_id ON companies(id);

CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_id ON profiles(id);

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(company_id, status);

CREATE INDEX idx_orders_company_id ON orders(company_id);
CREATE INDEX idx_orders_project_id ON orders(project_id);
CREATE INDEX idx_orders_requested_by ON orders(requested_by);
CREATE INDEX idx_orders_status ON orders(company_id, status);
CREATE INDEX idx_orders_company_project ON orders(company_id, project_id);

CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX idx_expenses_status ON expenses(company_id, status);
CREATE INDEX idx_expenses_company_project ON expenses(company_id, project_id);
CREATE INDEX idx_expenses_spend_date ON expenses(spend_date);

CREATE INDEX idx_deliveries_company_id ON deliveries(company_id);
CREATE INDEX idx_deliveries_project_id ON deliveries(project_id);
CREATE INDEX idx_deliveries_logged_by ON deliveries(logged_by);
CREATE INDEX idx_deliveries_status ON deliveries(company_id, status);

CREATE INDEX idx_activity_logs_company_created ON activity_logs(company_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);

-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Companies: Only members can read their own company
CREATE POLICY "Users can read own company" ON companies FOR SELECT
USING (
  id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Profiles: Users can read profiles in their company
CREATE POLICY "Users can read company profiles" ON profiles FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Projects policies
CREATE POLICY "Users can read company projects" ON projects FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can create projects" ON projects FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update projects" ON projects FOR UPDATE
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete projects" ON projects FOR DELETE
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Orders policies
CREATE POLICY "Users can read company orders" ON orders FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create orders" ON orders FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND requested_by = auth.uid()
  AND status = 'requested'
  AND project_id IS NULL -- Members cannot assign to projects
  AND decided_by IS NULL
  AND decided_at IS NULL
);

CREATE POLICY "Members can update own pending orders" ON orders FOR UPDATE
USING (
  requested_by = auth.uid()
  AND status = 'requested'
  AND company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  requested_by = auth.uid()
  AND status = 'requested'
  AND company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND project_id IS NULL -- Members cannot assign projects
  AND decided_by IS NULL
  AND decided_at IS NULL
);

CREATE POLICY "Admins can update company orders" ON orders FOR UPDATE
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Expenses policies
CREATE POLICY "Users can read company expenses" ON expenses FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create expenses" ON expenses FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND submitted_by = auth.uid()
  AND status = 'pending'
  AND project_id IS NULL -- Members cannot assign to projects
  AND decided_by IS NULL
  AND decided_at IS NULL
);

CREATE POLICY "Members can update own pending expenses" ON expenses FOR UPDATE
USING (
  submitted_by = auth.uid()
  AND status = 'pending'
  AND company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  submitted_by = auth.uid()
  AND status = 'pending'
  AND company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND project_id IS NULL -- Members cannot assign projects
  AND decided_by IS NULL
  AND decided_at IS NULL
);

CREATE POLICY "Admins can update company expenses" ON expenses FOR UPDATE
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Deliveries policies
CREATE POLICY "Users can read company deliveries" ON deliveries FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create deliveries" ON deliveries FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND logged_by = auth.uid()
  AND status = 'pending'
  AND project_id IS NULL -- Members cannot assign to projects
  AND confirmed_by IS NULL
  AND confirmed_at IS NULL
);

CREATE POLICY "Members can update own pending deliveries" ON deliveries FOR UPDATE
USING (
  logged_by = auth.uid()
  AND status = 'pending'
  AND company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  logged_by = auth.uid()
  AND status = 'pending'
  AND company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND project_id IS NULL -- Members cannot assign projects
  AND confirmed_by IS NULL
  AND confirmed_at IS NULL
);

CREATE POLICY "Admins can update company deliveries" ON deliveries FOR UPDATE
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Activity logs policies
CREATE POLICY "Users can read company activity logs" ON activity_logs FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert activity logs" ON activity_logs FOR INSERT
WITH CHECK (true); -- Allow system/service role to insert activity logs

-- Create storage bucket for delivery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliveries', 'deliveries', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for delivery photos
CREATE POLICY "Users can upload delivery photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deliveries'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view company delivery photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deliveries'
  AND EXISTS (
    SELECT 1 FROM deliveries d
    JOIN profiles p ON p.company_id = d.company_id
    WHERE p.id = auth.uid()
    AND d.photo_url LIKE '%' || name || '%'
  )
);