import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = cookies() as any
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string){ return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any){ cookieStore.set?.({ name, value, ...options }) },
        remove(name: string, options: any){ cookieStore.delete?.({ name, ...options }) },
      }
    })
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'logout_failed' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 }) }