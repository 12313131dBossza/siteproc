import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { supabaseService } from '@/lib/supabase'
import { broadcastPoUpdated, broadcastDashboardUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

// Simple test endpoint to force a realtime broadcast without changing PO state.
export async function POST(req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const id = context?.params?.id
    const sb = supabaseService()
    const { data: po } = await sb.from('pos').select('id').eq('company_id', companyId).eq('id', id).single()
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await broadcastPoUpdated(id, ['ping'])
  try { await broadcastDashboardUpdated(companyId) } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
