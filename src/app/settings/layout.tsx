import { createContext, useContext, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function fetchContext() {
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string){ return cookieStore.get(name)?.value } }
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('id,company_id,role,full_name').eq('id', user.id).single()
  const companyId = profile?.company_id || null
  let company: { id: string; name: string } | null = null
  if (companyId) {
    const { data: c } = await supabase.from('companies').select('id,name').eq('id', companyId).single()
    if (c) company = c as any
  }
  return { userEmail: user.email || '', role: profile?.role || '', companyName: company?.name || '', companyId: company?.id || '', fullName: profile?.full_name || '' }
}

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const ctx = await fetchContext()
  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-xs text-neutral-400">Manage your profile & organization</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <a href="/settings/profile" className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700">Profile</a>
          {ctx.role === 'admin' && (
            <>
              <a href="/settings/company" className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700">Company</a>
              <a href="/settings/invite" className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700">Invite</a>
            </>
          )}
        </nav>
      </div>
      <SettingsContextProvider value={ctx}>{children}</SettingsContextProvider>
    </div>
  )
}

// Simple context provider
const Ctx = createContext<any>(null)
function SettingsContextProvider({ value, children }: { value: any; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useSettingsContext() { return useContext(Ctx) }