import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sb = await sbServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ user: null, profile: null }, { status: 401 })
    const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single()
    return NextResponse.json({ user: { id: user.id, email: user.email }, profile })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
