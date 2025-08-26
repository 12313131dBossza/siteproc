import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function POST(req: Request) {
  const res = await requireAdmin({ redirectOnFail: false })
  if (!res.ok) {
    if (res.reason === 'unauthenticated') return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (res.reason === 'no_company') return NextResponse.json({ error: 'no_company' }, { status: 400 })
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(()=>({}))
  const name = (body.name||'').trim()
  if (!name || name.length < 2 || name.length > 64) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })

  const cookieStore = cookies() as any // for completeness though not used with service client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !serviceKey) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { error: updateErr } = await service.from('companies').update({ name }).eq('id', res.companyId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() { return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 }) }
