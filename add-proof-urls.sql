-- Adds a jsonb column to store delivery proof image URLs
ALTER TABLE IF NOT EXISTS public.deliveries
  ADD COLUMN IF NOT EXISTS proof_urls jsonb;

-- Optional: create a storage bucket named 'delivery-proofs' in Supabase Storage UI
-- and set it to public. You can add RLS via signed URLs later if needed.
