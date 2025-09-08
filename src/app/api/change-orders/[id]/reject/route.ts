import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } as any }
  )
  const coId = params.id

  const { data: co, error: coErr } = await supabase
    .from('change_orders')
    .select('id, status, created_by')
    .eq('id', coId)
    .single()
  if (coErr || !co) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (co.status !== 'pending') return NextResponse.json({ error: 'already_decided' }, { status: 400 })

  const { data: user } = await supabase.auth.getUser()
  const uid = user?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const up = await supabase
    .from('change_orders')
    .update({ status: 'rejected', decided_by: uid, decided_at: new Date().toISOString() })
    .eq('id', coId)
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 })

  // TODO: email requester + admins
  return NextResponse.json({ ok: true })
}
