import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { requireRole, hasRole, parseJson } from '@/lib/api'
import { supplierUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'

export const runtime = 'nodejs'

interface RouteContext { params: { id: string } }

export async function GET(req: NextRequest, context: RouteContext) {
  const companyId = req.headers.get('x-company-id') || ''
  if (!companyId) return NextResponse.json({ error: 'Missing company' }, { status: 400 })
  const sb = supabaseService()
  const { data, error } = await sb.from('suppliers').select('*').eq('company_id', companyId).eq('id', context?.params?.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const companyId = req.headers.get('x-company-id') || ''
  const actorId = req.headers.get('x-user-id') || undefined
  const role = req.headers.get('x-role') || ''
  if (!companyId) return NextResponse.json({ error: 'Missing company' }, { status: 400 })
  if (!hasRole(role, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const raw = await parseJson(req, supplierUpdateSchema)
  const parsed = supplierUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }
  const updateFields: { name?: string; email?: string; phone?: string; notes?: string } = parsed.data
  const sb = supabaseService()
  const { error } = await (sb as any).from('suppliers').update(updateFields).eq('company_id', companyId).eq('id', context?.params?.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit(companyId, actorId || null, 'supplier', context?.params?.id, 'update', parsed.data) } catch {}
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const companyId = req.headers.get('x-company-id') || ''
  const actorId = req.headers.get('x-user-id') || undefined
  const role = req.headers.get('x-role') || ''
  if (!companyId) return NextResponse.json({ error: 'Missing company' }, { status: 400 })
  if (!hasRole(role, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const sb = supabaseService()
  const { error } = await sb.from('suppliers').delete().eq('company_id', companyId).eq('id', context?.params?.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit(companyId, actorId || null, 'supplier', context?.params?.id, 'delete', {}) } catch {}
  return NextResponse.json({ ok: true })
}
