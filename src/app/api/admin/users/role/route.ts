import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const LOG_PREFIX = '[api/admin/users/role]'
const ALLOWED = ['admin','manager','member','viewer'] as const

export async function POST(req: Request) {
  try {
    const cookieStore = cookies() as any
    const anon = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
    const { data: { user } } = await anon.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { data: me } = await anon.from('profiles').select('company_id,role').eq('id', user.id).single()
    if (!me?.company_id || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    let body: any = {}
    try { body = await req.json() } catch {}
    const userId = (body.userId||'').trim()
    const role = (body.role||'').trim()
    if (!/^[0-9a-fA-F-]{32,36}$/.test(userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!ALLOWED.includes(role as any)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 })

    // Prevent removing last admin: check if target is admin and changing away
    if (role !== 'admin') {
      const { data: target } = await anon.from('profiles').select('role,company_id').eq('id', userId).single()
      if (target?.company_id !== me.company_id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      if (target?.role === 'admin') {
        const { count, error: cntErr } = await anon.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', me.company_id).eq('role','admin').neq('id', userId)
        if (cntErr) console.error(LOG_PREFIX, 'count_admins_error', cntErr)
        if ((count ?? 0) === 0) return NextResponse.json({ error: 'cannot_remove_last_admin' }, { status: 400 })
      }
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE
    if (!url || !serviceKey) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    const service = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { error: updErr } = await service.from('profiles').update({ role }).eq('id', userId).eq('company_id', me.company_id)
    if (updErr) { console.error(LOG_PREFIX, 'update_failed', updErr); return NextResponse.json({ error: 'update_failed' }, { status: 500 }) }
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    console.error(LOG_PREFIX, 'unhandled', e)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
}

export async function GET(){ return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 }) }
