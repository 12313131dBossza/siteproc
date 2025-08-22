import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { companyId } = getIds(req)
  const id = new URL(req.url).searchParams.get('id')
  const detail = new URL(req.url).searchParams.get('detail')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid id format (expected UUID)' }, { status: 400 })
  }
  const sb = supabaseService()
  const { data: poRows, error } = await sb
    .from('pos')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const po = (poRows || [])[0]
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

  if (!detail) return NextResponse.json(po)

  const [supplierRes, jobRes, itemsRes] = await Promise.all([
    po?.supplier_id
      ? sb
          .from('suppliers')
          .select('id,name,email,phone')
          .eq('company_id', companyId)
          .eq('id', po.supplier_id)
      : Promise.resolve({ data: [] } as any),
    po?.job_id
      ? sb
          .from('jobs')
          .select('id,name,code')
          .eq('company_id', companyId)
          .eq('id', po.job_id)
      : Promise.resolve({ data: [] } as any),
    po?.rfq_id
      ? sb.from('rfq_items').select('id,description,qty,unit,sku').eq('company_id', companyId).eq('rfq_id', po.rfq_id)
      : Promise.resolve({ data: [] } as any),
  ])

  const body = {
    ...po,
    supplier: Array.isArray((supplierRes as any).data) ? ((supplierRes as any).data[0] || null) : ((supplierRes as any).data || null),
    job: Array.isArray((jobRes as any).data) ? ((jobRes as any).data[0] || null) : ((jobRes as any).data || null),
    items: (itemsRes as any).data || [],
  }
  return NextResponse.json(body)
}
