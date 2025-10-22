import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const svc = supabaseService()
    const { data, error } = await svc
      .from('expenses')
      .select('id, company_id, user_id, amount, status, vendor, category, memo, created_at, approved_at, approved_by, decided_at, decided_by')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ expenses: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
