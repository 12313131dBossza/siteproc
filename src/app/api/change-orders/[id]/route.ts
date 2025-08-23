import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getIds } from '@/lib/api'

export const runtime = 'nodejs'

// Use a "context" param (instead of destructuring in the signature) to satisfy Next.js type validation.
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
  const { companyId } = getIds(req)
  const id = context.params.id
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
