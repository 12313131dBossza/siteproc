import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )

  const me = await supabase.auth.getUser()
  const uid = me.data.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const prof = await supabase.from('profiles').select('company_id, role').eq('id', uid as any).single()
  const myCompany = (prof.data as any)?.company_id
  if (!myCompany) return NextResponse.json({ error: 'no_company' }, { status: 400 })

  let q = supabase.from('projects').select('*').eq('company_id', myCompany).order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )

  const body = await req.json().catch(() => ({}))
  const { name, budget, code, status } = body as { name?: string; budget?: number; code?: string; status?: 'active'|'on_hold'|'closed' }
  if (!name || String(name).trim().length === 0) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (budget != null && Number(budget) < 0) return NextResponse.json({ error: 'budget_must_be_positive' }, { status: 400 })

  const me = await supabase.auth.getUser()
  const uid = me.data.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const prof = await supabase.from('profiles').select('company_id').eq('id', uid as any).single()
  const myCompany = (prof.data as any)?.company_id
  if (!myCompany) return NextResponse.json({ error: 'no_company' }, { status: 400 })

  const payload: any = {
    name: String(name).trim(),
    budget: Number(budget || 0),
    code: code ? String(code).trim() : null,
    status: status || 'active',
    company_id: myCompany,
    created_by: uid,
  }

  const { data, error } = await supabase.from('projects').insert(payload).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}