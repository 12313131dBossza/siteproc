-- ============================================================================
-- PHASE 15: ADVANCED SEARCH & FILTERING - DATABASE SCHEMA
-- Create saved_filters table and search infrastructure
-- ============================================================================

-- Create saved_filters table
CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK (module IN (
        'orders',
        'projects',
        'deliveries',
        'expenses',
        'payments',
        'products',
        'clients',
        'contractors'
    )),
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_company_id ON saved_filters(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_module ON saved_filters(module);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_module ON saved_filters(user_id, module);
CREATE INDEX IF NOT EXISTS idx_saved_filters_default ON saved_filters(user_id, module, is_default) WHERE is_default = TRUE;

-- Add table comment
COMMENT ON TABLE saved_filters IS 'User-saved filter combinations for quick access to frequently used views';
COMMENT ON COLUMN saved_filters.module IS 'The module/page this filter applies to: orders, projects, deliveries, expenses, payments, products, clients, contractors';
COMMENT ON COLUMN saved_filters.filters IS 'JSON object containing filter criteria (status, date_range, search, etc.)';
COMMENT ON COLUMN saved_filters.is_default IS 'If true, this filter is automatically applied when user visits the module';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saved filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can create their own saved filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can update their own saved filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can delete their own saved filters" ON saved_filters;

-- Policy: Users can only view their own saved filters
CREATE POLICY "Users can view their own saved filters"
    ON saved_filters
    FOR SELECT
    USING (
        auth.uid() = user_id
    );

-- Policy: Users can create saved filters
CREATE POLICY "Users can create their own saved filters"
    ON saved_filters
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND auth.uid() IS NOT NULL
    );

-- Policy: Users can update their own saved filters
CREATE POLICY "Users can update their own saved filters"
    ON saved_filters
    FOR UPDATE
    USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- Policy: Users can delete their own saved filters
CREATE POLICY "Users can delete their own saved filters"
    ON saved_filters
    FOR DELETE
    USING (
        auth.uid() = user_id
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a saved filter
CREATE OR REPLACE FUNCTION create_saved_filter(
    p_module TEXT,
    p_name TEXT,
    p_filters JSONB,
    p_is_default BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_filter_id UUID;
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get user's company
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE id = v_user_id;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User must be associated with a company';
    END IF;
    
    -- If this is being set as default, unset other defaults for this module
    IF p_is_default THEN
        UPDATE saved_filters
        SET is_default = FALSE
        WHERE user_id = v_user_id
          AND module = p_module
          AND is_default = TRUE;
    END IF;
    
    -- Create the saved filter
    INSERT INTO saved_filters (
        user_id,
        company_id,
        module,
        name,
        filters,
        is_default,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_company_id,
        p_module,
        p_name,
        p_filters,
        p_is_default,
        NOW(),
        NOW()
    ) RETURNING id INTO v_filter_id;
    
    RETURN v_filter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_saved_filter IS 'Create a new saved filter for the current user';

-- Function to get default filter for a module
CREATE OR REPLACE FUNCTION get_default_filter(p_module TEXT)
RETURNS JSONB AS $$
DECLARE
    v_filters JSONB;
BEGIN
    SELECT filters INTO v_filters
    FROM saved_filters
    WHERE user_id = auth.uid()
      AND module = p_module
      AND is_default = TRUE
    LIMIT 1;
    
    RETURN COALESCE(v_filters, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_default_filter IS 'Get the default filter for a module for the current user';

-- Function to set filter as default
CREATE OR REPLACE FUNCTION set_default_filter(p_filter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_module TEXT;
BEGIN
    -- Get the module for this filter
    SELECT module INTO v_module
    FROM saved_filters
    WHERE id = p_filter_id
      AND user_id = auth.uid();
    
    IF v_module IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Unset all defaults for this module
    UPDATE saved_filters
    SET is_default = FALSE
    WHERE user_id = auth.uid()
      AND module = v_module
      AND is_default = TRUE;
    
    -- Set this filter as default
    UPDATE saved_filters
    SET is_default = TRUE,
        updated_at = NOW()
    WHERE id = p_filter_id
      AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_default_filter IS 'Set a saved filter as the default for its module';

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Add full-text search indexes for better search performance
-- These use PostgreSQL's built-in full-text search capabilities

-- Orders search
CREATE INDEX IF NOT EXISTS idx_purchase_orders_search 
ON purchase_orders 
USING gin(to_tsvector('english', 
    COALESCE(description, '') || ' ' || 
    COALESCE(vendor, '') || ' ' || 
    COALESCE(product_name, '') || ' ' || 
    COALESCE(category, '')
));

-- Projects search
CREATE INDEX IF NOT EXISTS idx_projects_search 
ON projects 
USING gin(to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(code, '')
));

-- Products search
CREATE INDEX IF NOT EXISTS idx_products_search 
ON products 
USING gin(to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(sku, '') || ' ' || 
    COALESCE(category, '')
));

-- Expenses search
CREATE INDEX IF NOT EXISTS idx_expenses_search 
ON expenses 
USING gin(to_tsvector('english', 
    COALESCE(vendor, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(memo, '') || ' ' || 
    COALESCE(category, '')
));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table exists
SELECT 'Saved filters table created' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'saved_filters'
);

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'saved_filters'
ORDER BY indexname;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'saved_filters';

-- Check policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'saved_filters'
ORDER BY policyname;

-- Summary
SELECT '✅ Phase 15: Search & Filtering Database Schema Complete!' as status;
SELECT 'Table: saved_filters' as component, 'Created with RLS policies' as status
UNION ALL
SELECT 'Indexes: 9', 'Performance optimized (5 saved_filters + 4 full-text search)'
UNION ALL
SELECT 'Functions: 3', 'Helper functions for filter management'
UNION ALL
SELECT 'Policies: 4', 'User-scoped RLS policies'
UNION ALL
SELECT 'Full-text search', 'Enabled on orders, projects, products, expenses';
