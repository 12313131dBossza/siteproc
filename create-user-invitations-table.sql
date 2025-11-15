-- Create user_invitations table for Settings page
-- Run this in Supabase SQL Editor for your production database (gjstirrsnkqxsbolsufn)

-- Create the table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON public.user_invitations(company_id);

-- Enable Row Level Security
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_invitations_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_insert" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_update" ON public.user_invitations;

-- RLS Policy: Users can view invitations for their company
CREATE POLICY "user_invitations_select" ON public.user_invitations
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Admins and owners can create invitations
CREATE POLICY "user_invitations_insert" ON public.user_invitations
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- RLS Policy: Admins and owners can update invitations
CREATE POLICY "user_invitations_update" ON public.user_invitations
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_user_invitations_updated_at ON public.user_invitations;

CREATE TRIGGER trigger_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verify the table was created
SELECT 
  'user_invitations table created successfully' as message,
  COUNT(*) as invitation_count
FROM public.user_invitations;
