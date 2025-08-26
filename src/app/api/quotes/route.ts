import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
  const rfqId = new URL(req.url).searchParams.get('rfq')
  if (!rfqId) return NextResponse.json({ error: 'rfq required' }, { status: 400 })
  const sb = supabaseService()
  const { data, error } = await sb.from('quotes').select('*').eq('company_id', companyId).eq('rfq_id', rfqId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
