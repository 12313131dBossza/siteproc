import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { parseJson, requireRole } from '@/lib/api'
import { supplierCreateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const companyId = req.headers.get('x-company-id') || ''
  if (!companyId) return NextResponse.json({ error: 'Missing company' }, { status: 400 })
  const sb = supabaseService()
  const { data, error } = await sb.from('suppliers').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(Array.isArray(data) ? data : [])
}

export async function POST(req: NextRequest) {
  const companyId = req.headers.get('x-company-id') || ''
  const actorId = req.headers.get('x-user-id') || undefined
  if (!companyId) return NextResponse.json({ error: 'Missing company' }, { status: 400 })
  if (!requireRole(req, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const raw = await parseJson(req)
  const parsed = supplierCreateSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  const sb = supabaseService()
  const { data, error } = await sb.from('suppliers').insert({ company_id: companyId, ...parsed.data }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { await audit(companyId, actorId || null, 'supplier', data?.id, 'create', parsed.data) } catch {}
  return NextResponse.json({ id: data?.id })
}
