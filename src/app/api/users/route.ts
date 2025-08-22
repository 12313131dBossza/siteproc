import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export async function GET() {
  const sb = supabaseService()
  const { data, error } = await sb.from('profiles').select('id,email,role').limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(Array.isArray(data)? data: [])
}

export async function POST(req: NextRequest) {
  // Placeholder: In real app, trigger invite email / magic link.
  const body = await req.json().catch(()=> ({}))
  const { email, role } = body
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  const sb = supabaseService()
  // Upsert into profiles; real auth invite would be elsewhere.
  const { data, error } = await sb.from('profiles').insert({ email, role: role || 'foreman' }).select('id,email,role').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
