-- ============================================================
-- TEST DELAY SHIELD + LOCATION INTEGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- STEP 1: First, make sure location columns exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- ============================================================
-- STEP 2: Add a test location to your Delay Shield test project
-- ============================================================
UPDATE projects 
SET 
  city = 'Bangkok',
  state = 'Bangkok',
  country = 'TH',
  -- Clear cached coords so system will geocode fresh
  latitude = NULL,
  longitude = NULL,
  updated_at = NOW()
WHERE name LIKE '%Delay Shield Test%';

-- ============================================================
-- STEP 3: Verify the update worked
-- ============================================================
SELECT 
  '✅ PROJECT LOCATION SET' as status,
  id,
  name,
  city,
  state,
  country,
  latitude,
  longitude
FROM projects 
WHERE name LIKE '%Delay Shield Test%';

-- ============================================================
-- STEP 4: Check if there's an active alert for this project
-- ============================================================
SELECT 
  '📊 CURRENT ALERT' as status,
  a.id as alert_id,
  p.name as project_name,
  p.city,
  p.state,
  a.risk_level,
  a.risk_score,
  a.predicted_delay_days,
  a.status as alert_status,
  a.contributing_factors
FROM delay_shield_alerts a
JOIN projects p ON a.project_id = p.id
WHERE p.name LIKE '%Delay Shield Test%'
ORDER BY a.created_at DESC
LIMIT 1;

-- ============================================================
-- WHAT HAPPENS NEXT:
-- ============================================================
-- 1. Go to your app: /delay-shield or the project page
-- 2. Click "Scan Projects" or "Refresh"
-- 3. The system will:
--    - Read city='Bangkok', country='TH'
--    - Geocode to: 13.75°N, 100.50°E
--    - Fetch real Bangkok weather
--    - Include weather in risk factors
-- 4. Check Vercel logs to see: "[DelayShield] Geocoded Bangkok..."
-- ============================================================
