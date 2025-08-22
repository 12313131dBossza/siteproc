import { NextRequest, NextResponse } from 'next/server'
import { getIds } from '@/lib/api'
import { supabaseService } from '@/lib/supabase'
import { broadcastPoUpdated } from '@/lib/realtime'

export const runtime = 'nodejs'

// Simple test endpoint to force a realtime broadcast without changing PO state.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { companyId } = getIds(req)
    const id = params.id
    const sb = supabaseService()
    const { data: po } = await sb.from('pos').select('id').eq('company_id', companyId).eq('id', id).single()
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await broadcastPoUpdated(id, ['ping'])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
