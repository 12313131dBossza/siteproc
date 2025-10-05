-- 🚨 FIX PROJECTS RLS POLICIES
-- This will ensure you can see your company's projects

-- First, let's see current policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'projects';

-- Enable RLS if not enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their company projects" ON projects;
DROP POLICY IF EXISTS "Users can update their company projects" ON projects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;

-- Create new, correct policies
-- POLICY 1: Let users see projects from their company
CREATE POLICY "Users can view their company projects"
ON projects FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- POLICY 2: Let users create projects for their company
CREATE POLICY "Users can insert their company projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- POLICY 3: Let users update projects from their company
CREATE POLICY "Users can update their company projects"
ON projects FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Verify new policies
SELECT 
  '=== NEW POLICIES ===' as section,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'projects';

-- Test: Can you see projects now?
SELECT 
  '=== YOUR PROJECTS NOW ===' as section,
  id,
  name,
  company_id,
  status
FROM projects;
