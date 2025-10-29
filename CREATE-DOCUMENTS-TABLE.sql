-- ============================================================================
-- PHASE 17: DOCUMENT MANAGEMENT - DATABASE SCHEMA
-- Create documents table with file metadata and associations
-- ============================================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- File Information
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL, -- bytes
    file_type TEXT NOT NULL, -- MIME type
    file_extension TEXT,
    storage_path TEXT NOT NULL, -- Supabase storage path
    storage_bucket TEXT NOT NULL DEFAULT 'documents',
    
    -- Document Metadata
    title TEXT,
    description TEXT,
    category TEXT CHECK (category IN (
        'invoice',
        'contract',
        'photo',
        'report',
        'drawing',
        'permit',
        'receipt',
        'correspondence',
        'other'
    )),
    tags TEXT[], -- Array of tags
    
    -- Associations (nullable - document can be standalone)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    delivery_id UUID REFERENCES order_deliveries(id) ON DELETE SET NULL,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    is_latest_version BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_expense_id ON documents(expense_id);
CREATE INDEX IF NOT EXISTS idx_documents_delivery_id ON documents(delivery_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index on document content
CREATE INDEX IF NOT EXISTS idx_documents_search 
ON documents 
USING gin(to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(file_name, '') || ' ' ||
    COALESCE(array_to_string(tags, ' '), '')
));

-- Add table comments
COMMENT ON TABLE documents IS 'File and document storage with associations to projects, orders, expenses';
COMMENT ON COLUMN documents.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN documents.category IS 'Document category for organization';
COMMENT ON COLUMN documents.tags IS 'Flexible tagging system for categorization';
COMMENT ON COLUMN documents.version IS 'Version number for document versioning';
COMMENT ON COLUMN documents.parent_document_id IS 'Reference to parent document for versioning';
COMMENT ON COLUMN documents.is_latest_version IS 'Flag to identify the latest version';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view company documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Policy: Users can view documents in their company (not deleted)
CREATE POLICY "Users can view company documents"
    ON documents
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- Policy: Users can upload documents
CREATE POLICY "Users can upload documents"
    ON documents
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Policy: Users can update documents (admins can update all, users can update own)
CREATE POLICY "Users can update own documents"
    ON documents
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
    );

-- Policy: Admins can soft delete documents
CREATE POLICY "Users can delete own documents"
    ON documents
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats(p_company_id UUID)
RETURNS TABLE(
    total_documents BIGINT,
    total_size_bytes BIGINT,
    by_category JSONB,
    by_file_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_documents,
        COALESCE(SUM(file_size), 0)::BIGINT as total_size_bytes,
        (
            SELECT jsonb_object_agg(category, count)
            FROM (
                SELECT category, COUNT(*) as count
                FROM documents
                WHERE company_id = p_company_id AND deleted_at IS NULL
                GROUP BY category
            ) cat
        ) as by_category,
        (
            SELECT jsonb_object_agg(file_type, count)
            FROM (
                SELECT file_type, COUNT(*) as count
                FROM documents
                WHERE company_id = p_company_id AND deleted_at IS NULL
                GROUP BY file_type
            ) ft
        ) as by_file_type
    FROM documents
    WHERE company_id = p_company_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_document_stats IS 'Get document statistics for a company';

-- Function to soft delete a document
CREATE OR REPLACE FUNCTION soft_delete_document(p_document_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE documents
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_document_id
      AND deleted_at IS NULL
      AND company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
      )
      AND (
          uploaded_by = auth.uid()
          OR EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() 
              AND role IN ('owner', 'admin')
          )
      );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_document IS 'Soft delete a document (mark as deleted)';

-- Function to create new document version
CREATE OR REPLACE FUNCTION create_document_version(
    p_parent_id UUID,
    p_file_name TEXT,
    p_file_size BIGINT,
    p_file_type TEXT,
    p_file_extension TEXT,
    p_storage_path TEXT
)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
    v_parent_doc RECORD;
    v_new_version INTEGER;
BEGIN
    -- Get parent document info
    SELECT * INTO v_parent_doc
    FROM documents
    WHERE id = p_parent_id
      AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid());
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent document not found';
    END IF;
    
    -- Calculate new version number
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
    FROM documents
    WHERE parent_document_id = p_parent_id OR id = p_parent_id;
    
    -- Mark all previous versions as not latest
    UPDATE documents
    SET is_latest_version = FALSE
    WHERE (parent_document_id = p_parent_id OR id = p_parent_id)
      AND is_latest_version = TRUE;
    
    -- Create new version
    INSERT INTO documents (
        company_id,
        uploaded_by,
        file_name,
        file_size,
        file_type,
        file_extension,
        storage_path,
        storage_bucket,
        title,
        description,
        category,
        tags,
        project_id,
        order_id,
        expense_id,
        delivery_id,
        version,
        parent_document_id,
        is_latest_version,
        metadata
    ) VALUES (
        v_parent_doc.company_id,
        auth.uid(),
        p_file_name,
        p_file_size,
        p_file_type,
        p_file_extension,
        p_storage_path,
        v_parent_doc.storage_bucket,
        v_parent_doc.title,
        v_parent_doc.description,
        v_parent_doc.category,
        v_parent_doc.tags,
        v_parent_doc.project_id,
        v_parent_doc.order_id,
        v_parent_doc.expense_id,
        v_parent_doc.delivery_id,
        v_new_version,
        p_parent_id,
        TRUE,
        v_parent_doc.metadata
    ) RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_document_version IS 'Create a new version of an existing document';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_documents_timestamp ON documents;
CREATE TRIGGER trigger_update_documents_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table exists
SELECT 'Documents table created' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'documents'
);

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'documents'
ORDER BY indexname;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'documents';

-- Check policies
SELECT 
    policyname,
    cmd as command
FROM pg_policies
WHERE tablename = 'documents'
ORDER BY policyname;

-- Summary
SELECT '✅ Phase 17: Document Management Database Schema Complete!' as status;
SELECT 'Table: documents' as component, 'Created with RLS policies' as status
UNION ALL
SELECT 'Indexes: 13', 'Performance optimized (12 standard + 1 full-text search)'
UNION ALL
SELECT 'Functions: 3', 'Helper functions for document management'
UNION ALL
SELECT 'Policies: 4', 'Company-scoped RLS policies'
UNION ALL
SELECT 'Triggers: 1', 'Auto-update timestamp'
UNION ALL
SELECT 'Features', 'Version control, soft delete, associations, tagging';
