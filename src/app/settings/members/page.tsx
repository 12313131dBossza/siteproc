import AdminOnly from '@/components/AdminOnly'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import RoleSelect from '@/components/settings/RoleSelect'
import RemoveMemberButton from '@/components/settings/RemoveMemberButton'

export const dynamic = 'force-dynamic'

async function fetchMembers(companyId: string) {
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  // Assuming email isn't stored in profiles; show id as fallback
  const { data } = await supabase.from('profiles').select('id,full_name,role,company_id').eq('company_id', companyId)
  return data || []
}

export default async function MembersPage() {
  const res = await requireAdmin({ redirectOnFail: false })
  if (!res.ok) {
    if (res.reason === 'unauthenticated') return null
    if (res.reason === 'no_company') return <div className="text-sm text-neutral-400">No company found.</div>
    return <AdminOnly />
  }
  const members = await fetchMembers(res.companyId!)
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Members</h1>
      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead className="text-xs text-neutral-400">
          <tr>
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">User ID</th>
            <th className="text-left p-2">Role</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} className="bg-neutral-900 hover:bg-neutral-800">
              <td className="p-2">{m.full_name || '—'}</td>
              <td className="p-2 font-mono text-[11px] text-neutral-400">{m.id}</td>
              <td className="p-2"><RoleSelect userId={m.id} initialRole={m.role} self={m.id===res.userId} /></td>
              <td className="p-2"><RemoveMemberButton userId={m.id} disabled={m.id===res.userId} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {members.length===0 && <div className="text-xs text-neutral-500">No members.</div>}
    </div>
  )
}
