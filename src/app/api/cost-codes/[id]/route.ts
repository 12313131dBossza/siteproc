import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, context: any) {
  try {
    const { companyId } = getIds(req)
    const sb = supabaseService()
    const { data, error } = await sb.from('cost_codes').select('*').eq('company_id', companyId).eq('id', context?.params?.id).single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
