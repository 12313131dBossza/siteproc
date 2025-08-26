import AdminOnly from '@/components/AdminOnly'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import CompanyForm from './companyForm'

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

// Form moved to client component companyForm.tsx
