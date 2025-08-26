export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
  console.log('[guard/dashboard]', { uid: user?.id, cid: profile?.company_id })
  if (!profile?.company_id) redirect('/onboarding')
  return <>{children}</>
}