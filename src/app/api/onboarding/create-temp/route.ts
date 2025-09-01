import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const Body = z.object({ name: z.string().min(1) })

function log(level: 'info'|'error'|'warn', msg: string, meta?: any) {
  try { console[level](JSON.stringify({ ts: new Date().toISOString(), lvl: level, src: '[api/onboarding/create-temp]', msg, ...(meta||{}) })) } catch {}
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(()=> ({}))
    const parse = Body.safeParse(json)
    if (!parse.success) {
      log('error', 'invalid_body', { received: json })
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    // Get authenticated user
    const cookieStore = await cookies()
    const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { 
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {}
      }
    })
    
    const { data: { user }, error: userErr } = await anon.auth.getUser()
    if (userErr || !user) {
      log('error', 'auth_failed', { userErr: userErr?.message })
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    // Hardcoded service key for testing
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI"
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!url) {
      return NextResponse.json({ error: 'missing_url' }, { status: 500 })
    }

    const admin = createClient(url, serviceKey, { 
      auth: { persistSession: false }
    })

    // Create company
    const { data: company, error: compErr } = await admin
      .from('companies')
      .insert({ name: parse.data.name })
      .select('id')
      .single()

    if (compErr) {
      log('error', 'company_create_failed', { 
        error: compErr.message,
        code: compErr.code
      })
      return NextResponse.json({ 
        error: 'company_create_failed',
        details: compErr.message 
      }, { status: 500 })
    }

    // Create/update user profile
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email,
        company_id: company.id, 
        role: 'admin' 
      }, { onConflict: 'id' })

    if (profileErr) {
      log('error', 'profile_upsert_failed', { 
        error: profileErr.message,
        code: profileErr.code
      })
      return NextResponse.json({ 
        error: 'profile_create_failed',
        details: profileErr.message 
      }, { status: 500 })
    }

    log('info', 'company_created', { 
      userId: user.id, 
      companyId: company.id,
      companyName: parse.data.name 
    })

    return NextResponse.json({ ok: true, companyId: company.id })
  } catch (e: any) {
    log('error', 'unhandled', { err: e?.message })
    return NextResponse.json({ 
      error: 'unhandled',
      details: e?.message 
    }, { status: 500 })
  }
}
