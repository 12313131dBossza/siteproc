import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'

export const runtime = 'nodejs'

// Use the Web Request type for the first arg (per Next.js route handler spec) and cast when calling helpers.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
  const nextReq = request as unknown as NextRequest
  const { companyId } = getIds(nextReq)
  const id = params.id
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
