-- Create activity_logs table for audit trail
-- This table tracks all important actions in the system

-- Create enum for activity types
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'delivery',
        'expense',
        'order',
        'project',
        'payment',
        'user',
        'change_order',
        'product',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for activity actions
DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM (
        'created',
        'updated',
        'deleted',
        'approved',
        'rejected',
        'submitted',
        'completed',
        'cancelled',
        'status_changed',
        'invited',
        'processed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Activity classification
    type activity_type NOT NULL,
    action activity_action NOT NULL,
    
    -- Activity details
    title TEXT NOT NULL,
    description TEXT,
    
    -- User who performed the action
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT, -- Cached for display even if user deleted
    user_email TEXT, -- Cached for display
    
    -- Multi-tenancy
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Related entity (optional)
    entity_type TEXT, -- 'order', 'delivery', 'expense', etc.
    entity_id UUID, -- ID of the related entity
    
    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Status/outcome
    status TEXT, -- 'success', 'pending', 'failed', 'warning'
    amount NUMERIC(12, 2), -- For financial activities
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT activity_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_type_created 
    ON activity_logs(company_id, type, created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activity logs for their company
CREATE POLICY "Users can view company activity logs"
    ON activity_logs
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert activity logs for their company
CREATE POLICY "Users can create activity logs"
    ON activity_logs
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only admins/owners can delete activity logs (for cleanup)
CREATE POLICY "Admins can delete activity logs"
    ON activity_logs
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM profiles 
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- Create helper function to log activities
CREATE OR REPLACE FUNCTION log_activity(
    p_type activity_type,
    p_action activity_action,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_status TEXT DEFAULT 'success',
    p_amount NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_user_name TEXT;
    v_user_email TEXT;
    v_company_id UUID;
BEGIN
    -- Get user details if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT full_name, email INTO v_user_name, v_user_email
        FROM profiles
        WHERE user_id = p_user_id
        LIMIT 1;
    END IF;
    
    -- Use provided company_id or get from user
    v_company_id := p_company_id;
    IF v_company_id IS NULL AND p_user_id IS NOT NULL THEN
        SELECT company_id INTO v_company_id
        FROM profiles
        WHERE user_id = p_user_id
        LIMIT 1;
    END IF;
    
    -- Insert activity log
    INSERT INTO activity_logs (
        type,
        action,
        title,
        description,
        user_id,
        user_name,
        user_email,
        company_id,
        entity_type,
        entity_id,
        metadata,
        status,
        amount
    ) VALUES (
        p_type,
        p_action,
        p_title,
        p_description,
        p_user_id,
        v_user_name,
        v_user_email,
        v_company_id,
        p_entity_type,
        p_entity_id,
        p_metadata,
        p_status,
        p_amount
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- Example usage:
-- SELECT log_activity(
--     'delivery'::activity_type,
--     'created'::activity_action,
--     'Delivery #D-102 Created',
--     '8 pallets of cement scheduled for delivery',
--     auth.uid(),
--     NULL, -- company_id will be auto-detected
--     'delivery',
--     'some-uuid-here',
--     '{"delivery_id": "D-102", "items": 8}'::jsonb,
--     'success',
--     1250.00
-- );

COMMENT ON TABLE activity_logs IS 'Audit trail of all important system activities';
COMMENT ON COLUMN activity_logs.type IS 'Category of activity (delivery, expense, order, etc.)';
COMMENT ON COLUMN activity_logs.action IS 'Action performed (created, updated, approved, etc.)';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional context as JSON (flexible schema)';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of related entity for quick lookups';
COMMENT ON COLUMN activity_logs.entity_id IS 'UUID of related entity for quick lookups';
COMMENT ON FUNCTION log_activity IS 'Helper function to easily log activities with automatic user/company detection';

-- Create materialized view for activity stats (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS activity_stats AS
SELECT 
    company_id,
    type,
    action,
    status,
    DATE(created_at) as activity_date,
    COUNT(*) as activity_count,
    SUM(amount) as total_amount
FROM activity_logs
GROUP BY company_id, type, action, status, DATE(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_stats_company ON activity_stats(company_id);

-- Refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_activity_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY activity_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule the refresh (run this manually or via cron)
-- SELECT refresh_activity_stats();

-- Insert some example activity logs for testing
DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    -- Get first user and company for testing
    SELECT user_id, company_id INTO v_user_id, v_company_id
    FROM profiles
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Example delivery activity
        PERFORM log_activity(
            'delivery'::activity_type,
            'created'::activity_action,
            'Delivery #D-102 Created',
            '8 pallets of cement scheduled for delivery',
            v_user_id,
            v_company_id,
            'delivery',
            NULL,
            '{"delivery_id": "D-102", "items": 8}'::jsonb,
            'success',
            NULL
        );
        
        -- Example expense activity
        PERFORM log_activity(
            'expense'::activity_type,
            'approved'::activity_action,
            'Equipment Rental Expense Approved',
            'Excavator rental expense for foundation work',
            v_user_id,
            v_company_id,
            'expense',
            NULL,
            '{"expense_id": "EXP-045", "category": "equipment"}'::jsonb,
            'success',
            1240.00
        );
        
        -- Example order activity
        PERFORM log_activity(
            'order'::activity_type,
            'completed'::activity_action,
            'Purchase Order #PO-234 Completed',
            '20 steel beams delivered and verified',
            v_user_id,
            v_company_id,
            'order',
            NULL,
            '{"order_id": "PO-234", "items": 20}'::jsonb,
            'success',
            15000.00
        );
    END IF;
END $$;

-- Query to check the table was created and has data
SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT type) as unique_types,
    COUNT(DISTINCT user_id) as unique_users
FROM activity_logs;

-- Query to see recent activities
SELECT 
    id,
    type,
    action,
    title,
    user_name,
    status,
    created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 10;
