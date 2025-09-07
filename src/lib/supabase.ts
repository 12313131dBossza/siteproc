import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
// Support both env names to match different deploy setups
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY) as string

// Singleton caches so we don't create multiple GoTrueClient instances in browser
let _anonClient: ReturnType<typeof createClient> | null = null
let _serviceClient: ReturnType<typeof createClient> | null = null

function assertValidUrl(url: string, label: string) {
  if (!url) throw new Error(`${label} missing`)
  if (/[<>]|YOUR_SUPABASE_URL|YOUR-PROJECT/i.test(url)) {
    throw new Error(`${label} looks like a placeholder. Set your real Supabase project URL (https://xxxx.supabase.co) in .env.local and restart the dev server.`)
  }
  try { new URL(url) } catch {
    throw new Error(`${label} is invalid. Expected https://xxxx.supabase.co`)
  }
}

export function supabaseAnon() {
  assertValidUrl(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey || /YOUR|<.+>/i.test(anonKey)) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing or placeholder. Copy the anon key from Supabase → Project Settings → API.')
  if (_anonClient) return _anonClient
  _anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: {
        // Node/undici requires duplex: 'half' when sending a body; ensure it for all Supabase fetches
        fetch: ((input: any, init?: any) => {
          if (init && init.body != null && !init.duplex) init.duplex = 'half'
          return fetch(input as RequestInfo, init as RequestInit)
        }) as any,
      },
    })
  return _anonClient
}

export function supabaseService() {
  assertValidUrl(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceKey || /YOUR|<.+>/i.test(serviceKey)) {
    throw new Error('Service role key missing. Set SUPABASE_SERVICE_ROLE (preferred) or SUPABASE_SERVICE_ROLE_KEY with the service_role key from Supabase → Project Settings → API (server only).')
  }
  if (_serviceClient) return _serviceClient
  _serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: {
        fetch: ((input: any, init?: any) => {
          if (init && init.body != null && !init.duplex) init.duplex = 'half'
          return fetch(input as RequestInfo, init as RequestInit)
        }) as any,
      },
    })
  return _serviceClient
}

export type SupabaseClient = ReturnType<typeof supabaseAnon>
