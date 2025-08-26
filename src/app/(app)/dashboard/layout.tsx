export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'
import React from 'react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore()
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string){ return cookieStore.get(name)?.value } }
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  console.log('[guard/dashboard]', { uid: user?.id, cid: profile?.company_id, phase: 'anon_read' })
  if (!profile?.company_id) {
    try {
      const svc = supabaseService()
      const { data: p2 } = await (svc as any).from('profiles').select('company_id, role').eq('id', user.id).single()
      console.log('[guard/dashboard]', { uid: user?.id, cid: p2?.company_id, phase: 'service_fallback' })
      if (!p2?.company_id) redirect('/onboarding')
      return <>{children}</>
    } catch (e:any) {
      console.error('[guard/dashboard] fallback_error', e?.message)
      redirect('/onboarding')
    }
  }
  return <>{children}</>
}