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
  const { data: profile } = await supabase.from('profiles').select('company_id,role,companies(name)').eq('id', user.id).single()
  console.log('[settings/invite]', { uid: user.id, cid: profile?.company_id, role: profile?.role })
  if (!profile?.company_id) redirect('/onboarding')
  if (!(profile?.role === 'admin' || profile?.role === 'manager')) {
    return <div className="text-sm text-neutral-500">Invite is restricted to managers or admins.</div>
  }
  const companyId = profile.company_id
  const companyName = (profile as any).companies?.name
  return (
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Invite Teammates</h1>
          <p className="text-sm text-neutral-400">
            Share the invite link below with your team members to give them access to {companyName || 'your company'}.
          </p>
        </div>
        <InviteLink companyId={companyId} companyName={companyName} />
        <div className="space-y-3 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <h2 className="font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Invitations
          </h2>
          <p className="text-xs text-neutral-500">
            Email invitation feature coming soon. For now, share the link directly with your team.
          </p>
        </div>
  <div className="mt-8 text-xs text-neutral-600">Company ID: {companyId}</div>
      </div>
    )
}