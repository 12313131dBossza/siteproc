-- Migration: Documents module with document_type column
-- Date: 2025-10-30
-- Description: Adds document_type column and fixes documents table structure

-- First, check if documents table exists
DO $$
BEGIN
  -- If table doesn't exist, create it with all columns
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
    
    CREATE TABLE documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      
      -- Entity linking
      expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
      order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
      delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      
      -- File metadata
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      file_url TEXT, -- legacy compatibility
      
      -- Document classification
      document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('receipt', 'pod', 'invoice', 'quote', 'contract', 'other')),
      
      -- Optional metadata
      title TEXT,
      description TEXT,
      category TEXT,
      tags TEXT[],
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );
    
    RAISE NOTICE 'Created documents table with all columns';
    
  ELSE
    -- Table exists, add missing columns if needed
    
    -- Add document_type if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'document_type'
    ) THEN
      ALTER TABLE documents ADD COLUMN document_type TEXT NOT NULL DEFAULT 'other' 
        CHECK (document_type IN ('receipt', 'pod', 'invoice', 'quote', 'contract', 'other'));
      RAISE NOTICE 'Added document_type column';
    END IF;
    
    -- Add uploaded_by if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'uploaded_by'
    ) THEN
      ALTER TABLE documents ADD COLUMN uploaded_by UUID REFERENCES profiles(id) ON DELETE RESTRICT;
      RAISE NOTICE 'Added uploaded_by column';
    END IF;
    
    -- Add other missing columns
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'expense_id') THEN
      ALTER TABLE documents ADD COLUMN expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'order_id') THEN
      ALTER TABLE documents ADD COLUMN order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'delivery_id') THEN
      ALTER TABLE documents ADD COLUMN delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'tags') THEN
      ALTER TABLE documents ADD COLUMN tags TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'deleted_at') THEN
      ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    
    RAISE NOTICE 'Updated existing documents table with missing columns';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_expense_id ON documents(expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_delivery_id ON documents(delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags) WHERE tags IS NOT NULL;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view company documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can update own document metadata" ON documents;
DROP POLICY IF EXISTS "Admins and owners can delete documents" ON documents;

-- Create RLS Policies
CREATE POLICY "Users can view company documents"
  ON documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own document metadata"
  ON documents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can delete documents"
  ON documents FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS update_documents_timestamp ON documents;
CREATE TRIGGER update_documents_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Create/update storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
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

-- Storage policies
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

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;

-- Success message
SELECT 'Documents table updated successfully!' as status;
