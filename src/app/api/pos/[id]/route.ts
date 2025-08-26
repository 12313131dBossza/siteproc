import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, ctx: any) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const id = ctx?.params?.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await (supabaseService() as any).from('pos').select('*').eq('company_id', session.companyId).eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
