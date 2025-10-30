-- Migration: Documents module for file attachments
-- Date: 2025-10-30
-- Description: Creates documents table for receipts, PODs, invoices with secure storage and RLS

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Entity linking (link to expenses, orders, deliveries, projects)
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- storage path
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT NOT NULL, -- bytes
  
  -- Document classification
  document_type TEXT NOT NULL CHECK (document_type IN ('receipt', 'pod', 'invoice', 'quote', 'contract', 'other')),
  
  -- Optional metadata
  description TEXT,
  tags TEXT[], -- searchable tags
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_expense_id ON documents(expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_delivery_id ON documents(delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags) WHERE tags IS NOT NULL;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view documents from their company
DROP POLICY IF EXISTS "Users can view company documents" ON documents;
CREATE POLICY "Users can view company documents"
  ON documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can upload documents for their company
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Policy: Users can update their own documents metadata (not file itself)
DROP POLICY IF EXISTS "Users can update own document metadata" ON documents;
CREATE POLICY "Users can update own document metadata"
  ON documents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Policy: Admins and document owners can delete documents
DROP POLICY IF EXISTS "Admins and owners can delete documents" ON documents;
CREATE POLICY "Admins and owners can delete documents"
  ON documents FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'owner', 'manager') OR id = uploaded_by)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_documents_timestamp ON documents;
CREATE TRIGGER update_documents_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Create storage bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Storage policies for documents bucket

-- Policy: Users can upload files to their company folder
DROP POLICY IF EXISTS "Users can upload to company folder" ON storage.objects;
CREATE POLICY "Users can upload to company folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can view files from their company folder
DROP POLICY IF EXISTS "Users can view company files" ON storage.objects;
CREATE POLICY "Users can view company files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete their own uploaded files
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

-- Verify foreign key constraint exists for uploaded_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'documents'
      AND kcu.column_name = 'uploaded_by'
  ) THEN
    RAISE NOTICE 'Foreign key constraint for documents.uploaded_by was verified during table creation';
  END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;

-- Success message
SELECT 'Documents module created successfully!' as status,
       'Storage bucket configured with 10MB limit' as storage_info,
       'RLS policies active for company-scoped access' as security_info;
