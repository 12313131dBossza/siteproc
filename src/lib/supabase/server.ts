import { createClient } from '@supabase/supabase-js'

let _service: ReturnType<typeof createClient> | null = null

export function supabaseService() {
  if (_service) return _service
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) throw new Error('Service role env vars missing')
  _service = createClient(url, key, { auth: { persistSession: false } })
  return _service
}
