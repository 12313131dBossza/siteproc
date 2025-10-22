-- CREATE ACTIVITY_LOGS TABLE FOR AUDIT AND MONITORING
-- This table tracks all system activities

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('delivery', 'expense', 'order', 'project', 'payment', 'user', 'change_order', 'product', 'other')),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected', 'submitted', 'completed', 'cancelled', 'status_changed', 'invited', 'processed', 'failed')),
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('success', 'pending', 'failed', 'warning')),
  amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS activity_logs_company_id_idx ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_type_idx ON activity_logs(type);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view activity logs for their company" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs for their company" ON activity_logs;

CREATE POLICY "Enable read access for company members"
ON activity_logs FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for company members"
ON activity_logs FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

SELECT '✅ ACTIVITY_LOGS TABLE CREATED!' as status;
