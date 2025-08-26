import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminOnly from '@/components/AdminOnly'
import InviteLink from '@/components/settings/InviteLink'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

export default async function InvitePage() {
  try {
    const result = await requireAdmin({ redirectOnFail: false })
    if (!result.ok) {
      if (result.reason === 'unauthenticated') return null
      if (result.reason === 'no_company') return <div className="text-sm text-neutral-400">You have not joined a company.</div>
      return <AdminOnly />
    }
    const companyId = result.companyId!
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