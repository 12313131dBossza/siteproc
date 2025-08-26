import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile, enforceRole } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
  const session = await getSessionProfile()
  try { enforceRole('bookkeeper', session) } catch (e: any) { return e as any }
  const companyId = session.companyId as string
    const url = new URL(req.url)
    const entity = url.searchParams.get('entity')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)
    const sb = supabaseService()
    let query = sb.from('events').select('id,entity,entity_id,verb,payload,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit)
    if (entity) query = query.eq('entity', entity)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
