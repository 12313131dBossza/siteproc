-- Create a function that inserts into profiles WITHOUT triggering any other inserts
-- This bypasses all triggers on profiles table

CREATE OR REPLACE FUNCTION public.create_profile_direct(
  p_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_company_id UUID,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert directly into profiles
  INSERT INTO public.profiles (id, email, full_name, company_id, role, created_at, updated_at)
  VALUES (p_id, p_email, p_full_name, p_company_id, p_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    company_id = EXCLUDED.company_id,
    role = EXCLUDED.role,
    updated_at = NOW();
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.create_profile_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_direct TO service_role;
