import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminOnly from '@/components/AdminOnly'
import InviteLink from '@/components/settings/InviteLink'

export const dynamic = 'force-dynamic'

async function getSessionAndProfile() {
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id,role').eq('id', user.id).single()
  return { user, role: profile?.role || null, companyId: profile?.company_id || null }
}

export default async function InvitePage() {
  try {
    const { user, role, companyId } = await getSessionAndProfile()
    if (!companyId) return <div className="text-sm text-neutral-400">You have not joined a company.</div>
    if (role !== 'admin') return <AdminOnly />
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-xl font-semibold">Invite Teammates</h1>
        <p className="text-sm text-neutral-400">Share this link with teammates so they can join your company.</p>
        <InviteLink companyId={companyId} />
        <div className="space-y-3">
          <h2 className="font-medium">Send Email Invites (placeholder)</h2>
          <p className="text-[11px] text-neutral-500">Email sending not yet implemented.</p>
        </div>
        <div className="mt-8 text-xs text-neutral-500">Company ID: {companyId}</div>
      </div>
    )
  } catch (e:any) {
    return <div className="p-4 text-sm text-red-400 bg-neutral-900 rounded">Failed to load invite page: {e?.message||'Unknown error'}</div>
  }
}