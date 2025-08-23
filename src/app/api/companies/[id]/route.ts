import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest, context: any) {
  const sb = supabaseService()
  const { data, error } = await sb.from('companies').select('*').eq('id', context?.params?.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, context: any) {
  const body = await req.json().catch(()=> ({}))
  const { name, currency, units } = body || {}
  const sb = supabaseService()
  const { error } = await sb.from('companies').update({ name, currency, units }).eq('id', context?.params?.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit(context?.params?.id, null, 'company', context?.params?.id, 'update', { name, currency, units }) } catch {}
  return NextResponse.json({ ok: true })
}
