import { redirect } from 'next/navigation'
import { getSessionProfile, getSupabaseServer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function InvitePage() {
  const session = await getSessionProfile()
  if (!session.user) redirect('/login')
  if (!session.companyId) redirect('/onboarding')
  if (session.role !== 'admin') redirect('/admin/dashboard')
  const companyId = session.companyId
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/onboarding?c=${companyId}`
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Invite Teammates</h1>
      <p className="text-sm text-neutral-400">Share this link with teammates so they can join your company.</p>
      <div className="space-y-2">
        <label className="text-xs font-medium">Invite Link</label>
        <div className="flex gap-2">
          <input readOnly value={inviteUrl} className="sp-input flex-1" />
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="px-3 py-2 rounded bg-blue-600 text-white text-xs"
          >Copy</button>
        </div>
        <p className="text-[10px] text-neutral-500">Valid while your account remains active.</p>
      </div>
      <div className="space-y-3">
        <h2 className="font-medium">Send Email Invites (placeholder)</h2>
        <form className="flex gap-2" onSubmit={(e)=>e.preventDefault()}>
          <input placeholder="email@example.com" className="sp-input flex-1" />
          <button className="px-3 py-2 rounded bg-neutral-700 text-xs" disabled>Send</button>
        </form>
        <p className="text-[11px] text-neutral-500">Email sending not yet implemented.</p>
      </div>
      <div className="mt-8 text-xs text-neutral-500">Company ID: {companyId}</div>
    </div>
  )
}