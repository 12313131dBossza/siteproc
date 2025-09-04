import { createClient } from '@supabase/supabase-js';

// Service role client that bypasses RLS
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service configuration missing");
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
