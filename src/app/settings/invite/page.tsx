import InviteLink from '@/components/settings/InviteLink'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function InvitePage() {
  noStore()
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id,role').eq('id', user.id).single()
  console.log('[settings/invite]', { uid: user.id, cid: profile?.company_id, role: profile?.role })
  if (!profile?.company_id) redirect('/onboarding')
  if (!(profile?.role === 'admin' || profile?.role === 'manager')) {
    return <div className="text-sm text-neutral-500">Invite is restricted to managers or admins.</div>
  }
  const companyId = profile.company_id
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
}