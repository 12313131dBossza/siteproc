import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

// Use the Web Request type for the first arg (per Next.js route handler spec) and cast when calling helpers.
export async function GET(request: Request, context: any) {
  try {
  const nextReq = request as unknown as NextRequest
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
  const id = context?.params?.id
    const sb = supabaseService()
    const { data: co, error } = await sb
      .from('change_orders')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single()
    if (error || !co) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
    return NextResponse.json(co)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
