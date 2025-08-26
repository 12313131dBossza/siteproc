export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import { supabaseService } from '@/lib/supabase'
import { AdminHome, PMHome, PurchaserHome, FieldHome, BookkeeperHome } from './DashboardHomes'
import { cookies } from 'next/headers'

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
  const { data } = await (sb as any).from('profiles').select('role').limit(1)
  if (Array.isArray(data) && data.length) return (data as any)[0].role as string
  } catch {}
  return null
}

export default async function DashboardPage() {
  noStore()
  const rawRole = await fetchRole()
  const role = mapRole(rawRole)
  const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || ''
  const isAdminLike = role === 'admin' || role === 'pm' || role === 'purchaser'
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {process.env.NEXT_PUBLIC_DEV_TOOLS === 'true' && (
          <span className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700">DEV MODE</span>
        )}
      </div>
      {isAdminLike ? (
        <>
          {role === 'admin' && <AdminHome companyId={companyId} />}
          {role === 'pm' && <PMHome companyId={companyId} />}
          {role === 'purchaser' && <PurchaserHome companyId={companyId} />}
        </>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-3xl">
          <div className="p-4 rounded bg-neutral-900 border border-neutral-800">
            <h2 className="text-sm font-semibold mb-2">Quick Actions</h2>
            <ul className="text-xs space-y-1 text-neutral-400">
              <li><a className="hover:text-white" href="/admin/deliveries/new">Log a delivery</a></li>
              <li><a className="hover:text-white" href="/admin/expenses/new">Add an expense</a></li>
              <li><a className="hover:text-white" href="/admin/change-orders/new">Request change order</a></li>
            </ul>
          </div>
          <div className="p-4 rounded bg-neutral-900 border border-neutral-800">
            <h2 className="text-sm font-semibold mb-2">Status</h2>
            <p className="text-xs text-neutral-500">Limited view. Ask an admin for elevated access if needed.</p>
          </div>
        </div>
      )}
      {role === 'field' && !isAdminLike && <FieldHome companyId={companyId} />}
      {role === 'bookkeeper' && !isAdminLike && <BookkeeperHome companyId={companyId} />}
    </div>
  )
}
