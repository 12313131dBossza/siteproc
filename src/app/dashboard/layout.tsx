export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase'
import React from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore()
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string){ return cookieStore.get(name)?.value } }
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile?.company_id) {
    try {
      const svc = supabaseService()
      const { data: p2 } = await (svc as any).from('profiles').select('company_id, role').eq('id', user.id).single()
      if (!p2?.company_id) redirect('/onboarding')
    } catch {
      redirect('/onboarding')
    }
  }
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--sp-color-bg)] text-[var(--sp-color-foreground,inherit)] min-h-screen flex flex-col">
        <Topbar />
        <div className="flex flex-1 w-full">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
