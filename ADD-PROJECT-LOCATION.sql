-- ============================================================
-- ADD LOCATION FIELDS TO PROJECTS TABLE
-- For Delay Shield™ weather integration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add location columns to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Comment on columns
COMMENT ON COLUMN projects.address IS 'Project site address';
COMMENT ON COLUMN projects.city IS 'Project city';
COMMENT ON COLUMN projects.state IS 'Project state/province';
COMMENT ON COLUMN projects.country IS 'Project country (ISO code)';
COMMENT ON COLUMN projects.latitude IS 'GPS latitude for weather API';
COMMENT ON COLUMN projects.longitude IS 'GPS longitude for weather API';

-- Create index for quick location lookups
CREATE INDEX IF NOT EXISTS idx_projects_location 
ON projects(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================
-- VERIFY: Check the columns were added
-- ============================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('address', 'city', 'state', 'latitude', 'longitude');
