import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRe.test(String(id))) {
      return NextResponse.json({ error: 'Invalid id format (expected UUID)' }, { status: 400 })
    }

    const sb = supabaseService()
    const { data: delivery, error } = await sb
      .from('deliveries')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single()

    if (error || !delivery) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })

    const [itemsRes, photosRes] = await Promise.all([
      sb.from('delivery_items').select('id,description,qty,unit,sku,partial').eq('company_id', companyId).eq('delivery_id', id),
      sb.from('photos').select('id,url').eq('company_id', companyId).eq('entity', 'delivery').eq('entity_id', id),
    ])

    const base: any = delivery || {}
    const body = {
      ...base,
      items: (itemsRes.data as any[]) || [],
      photos: (photosRes.data as any[]) || [],
    }
    return NextResponse.json(body)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
