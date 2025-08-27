export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import { supabaseService } from '@/lib/supabase'

function mapRole(r: string | null | undefined): 'admin'|'pm'|'purchaser'|'field'|'bookkeeper' {
  if (!r) return 'field'
  const v = r.toLowerCase()
  if (['admin','owner'].includes(v)) return 'admin'
  if (['pm','project_manager','project-manager'].includes(v)) return 'pm'
  if (['purchaser','buyer','procurement'].includes(v)) return 'purchaser'
  if (['bookkeeper','accounting'].includes(v)) return 'bookkeeper'
  if (['foreman','field'].includes(v)) return 'field'
  return 'field'
}

async function fetchRole(): Promise<string | null> {
  try {
    const sb = supabaseService()
    const { data } = await (sb as any).from('profiles').select('role').limit(1)
    if (Array.isArray(data) && data.length) return (data as any)[0].role as string
  } catch {}
  return null
}

export default async function DashboardPage() {
  noStore()
  const rawRole = await fetchRole()
  const role = mapRole(rawRole)
  const isAdminLike = role === 'admin' || role === 'pm' || role === 'purchaser'
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {isAdminLike ? (
        <p className="text-sm text-neutral-400">Admin/Manager style dashboard placeholder.</p>
      ) : (
        <p className="text-sm text-neutral-400">Limited dashboard placeholder for role: {role}</p>
      )}
    </div>
  )
}
