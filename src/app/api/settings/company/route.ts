import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/requireAdmin'

const LOG_PREFIX = '[api/settings/company]'

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin({ redirectOnFail: false })
    if (!admin.ok) {
      if (admin.reason === 'unauthenticated') return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      if (admin.reason === 'no_company') return NextResponse.json({ error: 'no_company' }, { status: 400 })
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    let body: any = {}
    try { body = await req.json() } catch { /* ignore */ }
    const name = (body.name||'').trim()
    if (!name || name.length < 2 || name.length > 64) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error(LOG_PREFIX, 'missing env vars', { hasUrl: !!url, hasKey: !!serviceKey })
      return NextResponse.json({ error: 'unhandled' }, { status: 500 })
    }
    const service = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { error: updateErr } = await service.from('companies').update({ name }).eq('id', admin.companyId)
    if (updateErr) {
      console.error(LOG_PREFIX, 'update_failed', updateErr)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error(LOG_PREFIX, 'unhandled', e)
    return NextResponse.json({ error: 'unhandled' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 }) }
