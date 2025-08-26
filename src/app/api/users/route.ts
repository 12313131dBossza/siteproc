import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

// List users (profile ids + roles only)
export async function GET() {
  const sb = supabaseService()
  const { data, error } = await sb.from('profiles').select('id,role').limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(Array.isArray(data) ? data : [])
}

// Deprecated: creating users via this route is not supported (email removed)
export async function POST() {
  return NextResponse.json({ error: 'unsupported' }, { status: 405 })
}
