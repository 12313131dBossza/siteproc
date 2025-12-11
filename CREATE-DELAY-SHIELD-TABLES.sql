-- ============================================================
-- DELAY SHIELD™ AI - DATABASE SCHEMA
-- Creates tables for storing AI delay predictions and alerts
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the delay_shield_alerts table
CREATE TABLE IF NOT EXISTS delay_shield_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Risk assessment
  risk_score NUMERIC(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1), -- 0.00 to 1.00
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Prediction details
  predicted_delay_days INTEGER NOT NULL DEFAULT 0,
  financial_impact NUMERIC(14,2) DEFAULT 0, -- $ impact
  
  -- Contributing factors (JSON array)
  -- Example: [{"type": "supplier", "name": "ABC Concrete", "issue": "late delivery history"}, {"type": "weather", "forecast": "rain 3 days"}]
  contributing_factors JSONB DEFAULT '[]'::JSONB,
  
  -- Recovery options (JSON array of 3 options)
  -- Example: [{"id": 1, "name": "Switch Supplier", "type": "fastest", "cost": 500, "time_saved_days": 4, "description": "..."}]
  recovery_options JSONB DEFAULT '[]'::JSONB,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'applied')),
  
  -- If a recovery option was applied
  applied_option_id INTEGER, -- 1, 2, or 3
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES profiles(id),
  
  -- Auto-generated content
  change_order_id UUID REFERENCES change_orders(id),
  email_draft JSONB, -- {to: [], subject: "", body: ""}
  
  -- Metadata
  scan_source TEXT DEFAULT 'scheduled', -- 'scheduled', 'manual', 'realtime'
  weather_data JSONB, -- Cached weather forecast
  ai_model TEXT DEFAULT 'gpt-4o', -- Model used for analysis
  ai_response_raw JSONB, -- Raw AI response for debugging
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Alerts expire after 7 days
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delay_shield_company ON delay_shield_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_delay_shield_project ON delay_shield_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_delay_shield_status ON delay_shield_alerts(status);
CREATE INDEX IF NOT EXISTS idx_delay_shield_risk ON delay_shield_alerts(risk_level, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_delay_shield_active ON delay_shield_alerts(company_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_delay_shield_expires ON delay_shield_alerts(expires_at) WHERE status = 'active';

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_delay_shield_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delay_shield_updated ON delay_shield_alerts;
CREATE TRIGGER trigger_delay_shield_updated
  BEFORE UPDATE ON delay_shield_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_delay_shield_timestamp();

-- 4. Enable RLS
ALTER TABLE delay_shield_alerts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - company isolation
DROP POLICY IF EXISTS "delay_shield_select_company" ON delay_shield_alerts;
CREATE POLICY "delay_shield_select_company" ON delay_shield_alerts
  FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "delay_shield_insert_company" ON delay_shield_alerts;
CREATE POLICY "delay_shield_insert_company" ON delay_shield_alerts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "delay_shield_update_company" ON delay_shield_alerts;
CREATE POLICY "delay_shield_update_company" ON delay_shield_alerts
  FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "delay_shield_delete_company" ON delay_shield_alerts;
CREATE POLICY "delay_shield_delete_company" ON delay_shield_alerts
  FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 6. Create a view for dashboard summary
CREATE OR REPLACE VIEW delay_shield_summary AS
SELECT 
  company_id,
  COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
  COUNT(*) FILTER (WHERE status = 'active' AND risk_level = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE status = 'active' AND risk_level = 'high') as high_count,
  COUNT(*) FILTER (WHERE status = 'active' AND risk_level = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE status = 'active' AND risk_level = 'low') as low_count,
  COALESCE(SUM(financial_impact) FILTER (WHERE status = 'active'), 0) as total_financial_risk,
  MAX(risk_score) FILTER (WHERE status = 'active') as max_risk_score,
  MAX(CASE 
    WHEN status = 'active' THEN 
      CASE risk_level 
        WHEN 'critical' THEN 4 
        WHEN 'high' THEN 3 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 1 
        ELSE 0 
      END
    ELSE 0
  END) as highest_risk_level_num
FROM delay_shield_alerts
GROUP BY company_id;

-- 7. Grant access to the view
GRANT SELECT ON delay_shield_summary TO authenticated;

-- 8. Add helper function to get risk color
CREATE OR REPLACE FUNCTION get_delay_shield_color(risk_level TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE risk_level
    WHEN 'critical' THEN 'red'
    WHEN 'high' THEN 'red'
    WHEN 'medium' THEN 'amber'
    WHEN 'low' THEN 'green'
    ELSE 'gray'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'delay_shield_alerts'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'delay_shield_alerts';

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'delay_shield_alerts';

COMMENT ON TABLE delay_shield_alerts IS 'Delay Shield™ AI predictions and recovery recommendations for projects';
