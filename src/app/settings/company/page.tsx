import AdminOnly from '@/components/AdminOnly'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

async function fetchCompany() {
  const res = await requireAdmin({ redirectOnFail: false })
  if (!res.ok) return { res, company: null }
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: company } = await supabase.from('companies').select('id,name').eq('id', res.companyId!).single()
  return { res, company }
}

export default async function CompanySettingsPage() {
  const { res, company } = await fetchCompany()
  if (!res.ok) {
    if (res.reason === 'unauthenticated') return null
    if (res.reason === 'no_company') return <div className="text-sm text-neutral-400">No company found.</div>
    return <AdminOnly />
  }
  if (!company) return <div className="text-sm text-neutral-400">No company found.</div>
  return <CompanyForm initialName={company.name} />
}

// Client form component
function CompanyForm({ initialName }: { initialName: string }) {
  return (
    <form action={updateCompany} className="max-w-md space-y-4">
      <div>
        <label className="text-xs font-medium">Company Name</label>
        <input name="name" defaultValue={initialName} required minLength={2} maxLength={64} className="sp-input w-full mt-1" />
      </div>
      <SubmitArea />
    </form>
  )
}

// Use a server action wrapper to call fetch since Next 13+; fallback to client fetch if actions disabled
async function updateCompany(formData: FormData) {
  'use server'
  const name = (formData.get('name') as string || '').trim()
  if (!name || name.length < 2 || name.length > 64) return
  // Use relative URL to avoid dependency on NEXT_PUBLIC_SITE_URL in production server action.
  try {
    await fetch(process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL + '/api/settings/company' : 'http://localhost:3000/api/settings/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      // next: { revalidate: 0 } // optional: ensure fresh
    })
  } catch (e) {
    console.error('[settings/company] server action fetch failed', e)
  }
}

// Client status component
function SubmitArea() {
  return <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-xs">Save</button>
}
