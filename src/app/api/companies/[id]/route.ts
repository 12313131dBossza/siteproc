import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'

export const runtime = 'nodejs'

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const sb = supabaseService()
  const { data, error } = await sb.from('companies').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = await req.json().catch(()=> ({}))
  const { name, currency, units } = body || {}
  const sb = supabaseService()
  const { error } = await (sb as any).from('companies').update({ name, currency, units }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit(id, null, 'company', id, 'update', { name, currency, units }) } catch {}
  return NextResponse.json({ ok: true })
}
