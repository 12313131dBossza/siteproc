import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const Body = z.object({ companyId: z.string().uuid() })

function log(level: 'info'|'error'|'warn', msg: string, meta?: any) {
  try { console[level](JSON.stringify({ ts: new Date().toISOString(), lvl: level, src: '[api/onboarding/join]', msg, ...(meta||{}) })) } catch {}
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(()=> ({}))
    const parse = Body.safeParse(json)
    if (!parse.success) {
      log('error', 'invalid_body', { received: json })
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    // Get authenticated user (anon client only for auth context)
    const cookieStore = await cookies()
    const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { 
        get(name: string) { 
          return cookieStore.get(name)?.value 
        },
        set() {},
        remove() {}
      }
    })
    const { data: { user }, error: userErr } = await anon.auth.getUser()
    if (userErr || !user) {
      log('error', 'auth_failed', { userErr: userErr?.message })
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    // Service-role client for all data operations
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Temporary fallback to hardcoded key if env var is missing
    if (!serviceKey) {
      serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI"
      log('warn', 'using_hardcoded_service_key', { reason: 'env_var_missing' })
    }
    
    log('info', 'env_check', { 
      hasUrl: !!url, 
      hasServiceKey: !!serviceKey,
      urlPrefix: url?.substring(0, 30) + '...',
      serviceKeyPrefix: serviceKey?.substring(0, 20) + '...'
    })
    
    if (!url || !serviceKey) {
      log('error', 'env_missing', { 
        hasUrl: !!url, 
        hasServiceKey: !!serviceKey,
        NODE_ENV: process.env.NODE_ENV
      })
      return NextResponse.json({ 
        error: 'server_misconfigured',
        details: `Missing: ${!url ? 'SUPABASE_URL' : ''} ${!serviceKey ? 'SERVICE_KEY' : ''}`.trim()
      }, { status: 500 })
    }
    
    const admin = createClient(url, serviceKey, { 
      auth: { persistSession: false },
      global: { headers: { 'x-application-name': 'siteproc-api' } }
    })

    // Optional BEFORE state (for logging only)
    let before: { company_id: string | null, role: string | null } | null = null
    {
      const { data, error } = await admin.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle?.() as any
      if (!error) before = data
    }

    // Validate company exists
    const { data: company, error: compErr } = await admin.from('companies').select('id').eq('id', parse.data.companyId).single()
    if (compErr || !company) {
      log('error', 'company_not_found', { 
        companyId: parse.data.companyId, 
        error: compErr?.message,
        code: compErr?.code
      })
      return NextResponse.json({ 
        error: 'not_found', 
        details: compErr?.message || 'Company not found'
      }, { status: 404 })
    }

    // Single UPSERT (insert if missing, update if exists) assigning company + default role.
    // Using onConflict id ensures we don't create duplicates; returning row for verification.
    const { data: upserted, error: upsertErr } = await admin
      .from('profiles')
      .upsert({ id: user.id, company_id: company.id, role: 'member' }, { onConflict: 'id' })
      .select('company_id')
      .single()

    if (upsertErr) {
      const msg = upsertErr.message || ''
      log('error','upsert_failed',{ 
        user: user.id, 
        company: company.id, 
        errorCode: upsertErr.code,
        errorMessage: msg,
        errorDetails: upsertErr.details,
        errorHint: upsertErr.hint 
      })
      if (/cannot_remove_last_admin|last\s+admin/i.test(msg)) {
        log('warn','blocked_last_admin',{ user: user.id, company: company.id, err: msg })
        return NextResponse.json({ error: 'cannot_remove_last_admin' }, { status: 400 })
      }
      return NextResponse.json({ 
        error: 'update_failed', 
        details: msg,
        code: upsertErr.code 
      }, { status: 500 })
    }

    // Verify state (handles rare replication lag)
    if (upserted?.company_id !== company.id) {
      await new Promise(r=>setTimeout(r,100))
      const { data: reread } = await admin.from('profiles').select('company_id').eq('id', user.id).single()
      if (reread?.company_id !== company.id) {
        log('error','post_verify_mismatch',{ expected: company.id, actual: reread?.company_id })
        return NextResponse.json({ error: 'update_failed' }, { status: 500 })
      }
      log('info','joined_retry',{ user: user.id, company: company.id, before: before?.company_id })
    } else {
      log('info','joined',{ user: user.id, company: company.id, before: before?.company_id })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    log('error','unhandled',{ err: e?.message })
    return NextResponse.json({ error: 'unhandled' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
