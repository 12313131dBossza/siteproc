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
    if (!parse.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

    const cookieStore = cookies() as any
    const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { get(name: string){ return cookieStore.get(name)?.value } }
    })
    const { data: { user }, error: userErr } = await anon.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE
    if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    // Read BEFORE state
    const { data: before } = await admin.from('profiles').select('company_id').eq('id', user.id).single()

    // Ensure profile row exists (idempotent) if not found
    if (!before) {
      const { error: upsertErr } = await admin.from('profiles').upsert({ id: user.id }).eq('id', user.id)
      if (upsertErr) {
        log('error','profile_upsert_failed',{ err: upsertErr.message })
        return NextResponse.json({ error: 'profile_upsert_failed' }, { status: 500 })
      }
    }

    // Company exists?
    const { data: company, error: compErr } = await admin.from('companies').select('id').eq('id', parse.data.companyId).single()
    if (compErr || !company) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // Attempt update with returning row; retry once if mismatch
    const attemptUpdate = async () => {
      const { data: updated, error: updErr } = await admin
        .from('profiles')
        .update({ company_id: company.id, role: 'member' })
        .eq('id', user.id)
        .select('company_id')
        .single()
      return { updated, updErr }
    }
    let { updated, updErr } = await attemptUpdate()
    if (updErr) {
      const msg = updErr.message || ''
      if (msg.includes('cannot_remove_last_admin')) {
        return NextResponse.json({ error: 'cannot_remove_last_admin' }, { status: 400 })
      }
      log('error','update_failed',{ err: msg })
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }
    if (updated?.company_id !== company.id) {
      // Brief backoff then re-select
      await new Promise(r=>setTimeout(r,100))
      const { data: reread } = await admin.from('profiles').select('company_id').eq('id', user.id).single()
      console.log('[api/onboarding/join]', { uid: user.id, before: before?.company_id, after: reread?.company_id, target: company.id, phase:'retry' })
      if (reread?.company_id !== company.id) {
        log('error','post_verify_mismatch',{ expected: company.id, actual: reread?.company_id })
        return NextResponse.json({ error: 'update_failed' }, { status: 500 })
      }
      updated = reread
    } else {
      console.log('[api/onboarding/join]', { uid: user.id, before: before?.company_id, after: updated?.company_id, target: company.id, phase:'initial' })
    }
    log('info','joined',{ user: user.id, company: company.id })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    log('error','unhandled',{ err: e?.message })
    return NextResponse.json({ error: 'unhandled' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
