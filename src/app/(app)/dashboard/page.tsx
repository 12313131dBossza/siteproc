import { supabaseService } from '@/lib/supabase'
import { AdminHome, PMHome, PurchaserHome, FieldHome, BookkeeperHome } from './DashboardHomes'

export const runtime = 'nodejs'

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
    const { data } = await sb.from('profiles').select('role').limit(1)
    if (Array.isArray(data) && data.length) return data[0].role as string
  } catch {}
  return null
}

export default async function DashboardPage() {
  const rawRole = await fetchRole()
  const role = mapRole(rawRole)
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {process.env.NEXT_PUBLIC_DEV_TOOLS === 'true' && (
          <span className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700">DEV MODE</span>
        )}
      </div>
      {role === 'admin' && <AdminHome />}
      {role === 'pm' && <PMHome />}
      {role === 'purchaser' && <PurchaserHome />}
      {role === 'field' && <FieldHome />}
      {role === 'bookkeeper' && <BookkeeperHome />}
    </div>
  )
}
