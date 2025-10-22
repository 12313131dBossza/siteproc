import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const svc = supabaseService() as any

    // Fetch latest 20 deliveries with items via service role to bypass RLS and confirm visibility
    const { data: deliveries, error } = await svc
      .from('deliveries')
      .select('*, delivery_items(*)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: deliveries?.length || 0, deliveries })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
