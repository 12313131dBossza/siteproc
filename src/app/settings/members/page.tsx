import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
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
  noStore()
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id,role').eq('id', user.id).single()
  console.log('[settings/members]', { uid: user.id, cid: profile?.company_id, role: profile?.role })
  if (!profile?.company_id) redirect('/onboarding')
  if (!(profile?.role === 'admin' || profile?.role === 'manager')) {
    return <div className="text-sm text-neutral-500">Members are visible to managers or admins.</div>
  }
  const members = await fetchMembers(profile.company_id)
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
              <td className="p-2"><RoleSelect userId={m.id} initialRole={m.role} self={m.id===user.id} /></td>
              <td className="p-2"><RemoveMemberButton userId={m.id} disabled={m.id===user.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {members.length===0 && <div className="text-xs text-neutral-500">No members.</div>}
    </div>
  )
}
