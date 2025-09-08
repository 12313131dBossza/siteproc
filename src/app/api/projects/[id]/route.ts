import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const { id } = params
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const body = await req.json().catch(() => ({}))
  const { name, budget, status } = body as { name?: string; budget?: number; status?: 'active'|'on_hold'|'closed' }

  const updates: any = {}
  if (typeof name === 'string') updates.name = name
  if (budget != null) {
    if (Number(budget) < 0) return NextResponse.json({ error: 'budget_must_be_positive' }, { status: 400 })
    updates.budget = Number(budget)
  }
  if (status) updates.status = status

  const { data, error } = await supabase.from('projects').update(updates).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
