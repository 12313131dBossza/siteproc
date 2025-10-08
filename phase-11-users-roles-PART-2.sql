    -- =====================================================
    -- Phase 11: Users & Roles Management (PART 2 - Tables & Functions)
    -- =====================================================
    -- Run this AFTER phase-11-users-roles-PART-1.sql has been committed

    -- Step 2: Update profiles table with role management
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Add constraint for status if it doesn't exist
    DO $$ 
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
        CHECK (status IN ('active', 'pending', 'inactive', 'suspended'));
    END IF;
    END $$;

    -- Add index for role-based queries
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
    CREATE INDEX IF NOT EXISTS idx_profiles_company_role ON profiles(company_id, role);

    -- Step 3: Create role_permissions table for granular permissions
    CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Add unique constraint to prevent duplicate permissions
    CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_unique 
    ON role_permissions(role, resource, action);

    -- Step 4: Clear existing permissions and seed fresh (to avoid conflicts)
    DELETE FROM role_permissions;

    -- Seed default role permissions
    INSERT INTO role_permissions (role, resource, action, description) VALUES
    -- Owner: Full access to everything
    ('owner', 'users', 'manage', 'Full user management including role changes'),
    ('owner', 'company', 'manage', 'Company settings and configuration'),
    ('owner', 'orders', 'manage', 'Full order management'),
    ('owner', 'deliveries', 'manage', 'Full delivery management'),
    ('owner', 'products', 'manage', 'Full product and inventory management'),
    ('owner', 'projects', 'manage', 'Full project management'),
    ('owner', 'financials', 'manage', 'Full financial access and reports'),
    
    -- Admin: Manage operations but cannot change ownership
    ('admin', 'users', 'create', 'Invite new users'),
    ('admin', 'users', 'read', 'View all users'),
    ('admin', 'users', 'update', 'Update user details (not role)'),
    ('admin', 'orders', 'manage', 'Full order management'),
    ('admin', 'deliveries', 'manage', 'Full delivery management'),
    ('admin', 'products', 'manage', 'Full product management'),
    ('admin', 'projects', 'manage', 'Full project management'),
    ('admin', 'financials', 'read', 'View financial reports'),
    
    -- Manager: Operational management
    ('manager', 'orders', 'create', 'Create new orders'),
    ('manager', 'orders', 'read', 'View orders'),
    ('manager', 'orders', 'update', 'Update order details'),
    ('manager', 'deliveries', 'create', 'Create deliveries'),
    ('manager', 'deliveries', 'read', 'View deliveries'),
    ('manager', 'deliveries', 'update', 'Update delivery status and POD'),
    ('manager', 'products', 'read', 'View products'),
    ('manager', 'products', 'update', 'Update product inventory'),
    ('manager', 'projects', 'read', 'View projects'),
    ('manager', 'projects', 'update', 'Update project details'),
    ('manager', 'users', 'read', 'View team members'),
    
    -- Accountant: Financial focus
    ('accountant', 'orders', 'read', 'View orders for financial tracking'),
    ('accountant', 'deliveries', 'read', 'View deliveries for invoicing'),
    ('accountant', 'products', 'read', 'View products and pricing'),
    ('accountant', 'projects', 'read', 'View projects and budgets'),
    ('accountant', 'financials', 'manage', 'Manage invoices, payments, reports'),
    ('accountant', 'users', 'read', 'View team members'),
    
    -- Viewer: Read-only access
    ('viewer', 'orders', 'read', 'View orders'),
    ('viewer', 'deliveries', 'read', 'View deliveries'),
    ('viewer', 'products', 'read', 'View products'),
    ('viewer', 'projects', 'read', 'View projects');

    -- Step 5: Create user_activity_log table for audit trail
    CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create indexes for activity logs
    CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity_log(action);
    CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_activity_company_id ON user_activity_log(company_id);

    -- Step 6: Create user_invitations table
    CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitation_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
    CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
    CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);

    -- Step 7: Create function to check user permissions
    CREATE OR REPLACE FUNCTION has_permission(
    user_id UUID,
    required_resource TEXT,
    required_action TEXT
    )
    RETURNS BOOLEAN AS $$
    DECLARE
    user_role_val user_role;
    has_perm BOOLEAN;
    BEGIN
    -- Get user's role
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = user_id AND status = 'active';
    
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has the specific permission
    SELECT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role = user_role_val
        AND resource = required_resource
        AND (action = required_action OR action = 'manage')
    ) INTO has_perm;
    
    RETURN has_perm;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Step 8: Create function to log user activity
    CREATE OR REPLACE FUNCTION log_user_activity(
    action_name TEXT,
    resource_name TEXT DEFAULT NULL,
    resource_id_val UUID DEFAULT NULL,
    details_json JSONB DEFAULT NULL
    )
    RETURNS UUID AS $$
    DECLARE
    activity_id UUID;
    user_company_id UUID;
    BEGIN
    -- Get user's company_id
    SELECT company_id INTO user_company_id
    FROM profiles
    WHERE id = auth.uid();
    
    -- Insert activity log
    INSERT INTO user_activity_log (
        user_id,
        action,
        resource,
        resource_id,
        details,
        company_id
    ) VALUES (
        auth.uid(),
        action_name,
        resource_name,
        resource_id_val,
        details_json,
        user_company_id
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Step 9: Create trigger to update last_login on profiles
    CREATE OR REPLACE FUNCTION update_last_login()
    RETURNS TRIGGER AS $$
    BEGIN
    UPDATE profiles
    SET last_login = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Step 10: Create trigger to auto-update updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
    CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS trigger_user_invitations_updated_at ON user_invitations;
    CREATE TRIGGER trigger_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    -- Step 11: Enable RLS on new tables
    ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
    DROP POLICY IF EXISTS "user_activity_log_select" ON user_activity_log;
    DROP POLICY IF EXISTS "user_activity_log_insert" ON user_activity_log;
    DROP POLICY IF EXISTS "user_invitations_select" ON user_invitations;
    DROP POLICY IF EXISTS "user_invitations_insert" ON user_invitations;
    DROP POLICY IF EXISTS "user_invitations_update" ON user_invitations;
    DROP POLICY IF EXISTS "profiles_select" ON profiles;
    DROP POLICY IF EXISTS "profiles_update" ON profiles;

    -- RLS Policies for role_permissions (read-only for all authenticated users)
    CREATE POLICY "role_permissions_select" ON role_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

    -- RLS Policies for user_activity_log
    CREATE POLICY "user_activity_log_select" ON user_activity_log
    FOR SELECT USING (
        company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = user_activity_log.company_id
        )
        )
    );

    CREATE POLICY "user_activity_log_insert" ON user_activity_log
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

    -- RLS Policies for user_invitations
    CREATE POLICY "user_invitations_select" ON user_invitations
    FOR SELECT USING (
        company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = user_invitations.company_id
        )
    );

    CREATE POLICY "user_invitations_insert" ON user_invitations
    FOR INSERT WITH CHECK (
        invited_by = auth.uid()
        AND company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = user_invitations.company_id
        )
    );

    CREATE POLICY "user_invitations_update" ON user_invitations
    FOR UPDATE USING (
        company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = user_invitations.company_id
        )
    );

    -- Update existing profiles RLS policies
    CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING (
        id = auth.uid()
        OR
        company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

    CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR
        (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = profiles.company_id
        )
        )
    );

    -- Step 12: Create helpful views
    CREATE OR REPLACE VIEW user_permissions_view AS
    SELECT 
    p.id AS user_id,
    u.email,
    p.full_name,
    p.role,
    p.company_id,
    rp.resource,
    rp.action,
    rp.description
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    CROSS JOIN role_permissions rp
    WHERE p.role::text = rp.role::text
    AND p.status = 'active';

    CREATE OR REPLACE VIEW active_users_summary AS
    SELECT 
    p.company_id,
    c.name AS company_name,
    p.role,
    COUNT(*) AS user_count,
    COUNT(*) FILTER (WHERE p.status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE p.status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE p.last_login >= NOW() - INTERVAL '7 days') AS recently_active
    FROM profiles p
    LEFT JOIN companies c ON c.id = p.company_id
    GROUP BY p.company_id, c.name, p.role
    ORDER BY p.company_id, p.role;

    -- Step 13: Add helpful comments
    COMMENT ON TYPE user_role IS 'User role types: owner (full access), admin (manage operations), manager (operational tasks), accountant (financial focus), viewer (read-only)';
    COMMENT ON TABLE role_permissions IS 'Defines granular permissions for each role';
    COMMENT ON TABLE user_activity_log IS 'Audit trail of all user actions';
    COMMENT ON TABLE user_invitations IS 'Pending user invitations to join the company';
    COMMENT ON COLUMN profiles.role IS 'User role determining access level and permissions';
    COMMENT ON COLUMN profiles.status IS 'User status: active (full access), pending (awaiting setup), inactive (disabled), suspended (temporarily blocked)';
    COMMENT ON FUNCTION has_permission IS 'Check if a user has permission to perform an action on a resource';
    COMMENT ON FUNCTION log_user_activity IS 'Log user activity for audit trail';

    -- ✅ Phase 11: Users & Roles Management Complete!
    -- 👥 Added role system with 5 roles (Owner, Admin, Manager, Accountant, Viewer)
    -- 🔐 Created granular permission system
    -- 📝 Added user activity logging
    -- 📧 Created invitation system
    -- 🔒 Configured RLS policies for role-based access
    -- 📊 Created helpful views for reporting
