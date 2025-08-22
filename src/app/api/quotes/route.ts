import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { companyId } = getIds(req)
  const rfqId = new URL(req.url).searchParams.get('rfq')
  if (!rfqId) return NextResponse.json({ error: 'rfq required' }, { status: 400 })
  const sb = supabaseService()
  const { data, error } = await sb.from('quotes').select('*').eq('company_id', companyId).eq('rfq_id', rfqId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
