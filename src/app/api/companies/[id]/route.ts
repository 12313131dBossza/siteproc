import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseService()
  const { data, error } = await sb.from('companies').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(()=> ({}))
  const { name, currency, units } = body || {}
  const sb = supabaseService()
  const { error } = await sb.from('companies').update({ name, currency, units }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit(params.id, null, 'company', params.id, 'update', { name, currency, units }) } catch {}
  return NextResponse.json({ ok: true })
}
