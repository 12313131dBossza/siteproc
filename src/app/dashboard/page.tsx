'use client'
import { useEffect, useState, useMemo } from 'react'
import { AdminDashboard, PMDashboard, PurchaserDashboard, FieldDashboard, BookkeeperDashboard, DashboardCounts } from './DashboardViews'

// Reusable metric tile
// Attempt to map DB role -> dashboard persona
function mapRole(raw: string | undefined): string {
  if (!raw) return 'field'
  const r = raw.toLowerCase()
  if (['admin','owner'].includes(r)) return 'admin'
  if (['pm','project_manager','project-manager'].includes(r)) return 'pm'
  if (['purchaser','buyer','procurement'].includes(r)) return 'purchaser'
  if (['bookkeeper','accounting'].includes(r)) return 'bookkeeper'
  if (['foreman','field'].includes(r)) return 'field'
  return 'field'
}

export default function Dashboard() {
  const [role, setRole] = useState<string>('field')
  const [counts, setCounts] = useState<DashboardCounts>({})
  const [loading, setLoading] = useState(false)
  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''

  // Load role from (mock) first user or localStorage fallback
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // If explicit stored role, prefer it (developer convenience)
        const stored = typeof window !== 'undefined' ? localStorage.getItem('role') : null
        if (stored) { setRole(mapRole(stored)); return }
        const r = await fetch('/api/users').then(r => r.json().catch(() => []))
        if (!active) return
        if (Array.isArray(r) && r.length) {
          setRole(mapRole(r[0].role))
        }
      } catch { /* ignore */ }
    })()
    return () => { active = false }
  }, [])

  // Fetch lightweight counts that power multiple personas
  useEffect(() => {
    let active = true
    if (!companyId) return
    setLoading(true)
    const endpoints = ['jobs','rfqs','quotes','po','deliveries','change-orders','expenses']
    ;(async () => {
      try {
        const results = await Promise.all(endpoints.map(ep => fetch(`/api/${ep}?limit=50`, { headers: { 'x-company-id': companyId } }).then(r => r.json().catch(() => ({ items: [] }))) ))
        if (!active) return
  const next: DashboardCounts = {}
        endpoints.forEach((ep,i) => {
          const data = results[i]
          const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : [])
          next[ep.replace(/-/g,'_')] = arr.length
        })
        setCounts(next)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [companyId])

  const persona = mapRole(role)

  const view = useMemo(() => {
    switch (persona) {
    case 'admin': return <AdminDashboard counts={counts} loading={loading} />
    case 'pm': return <PMDashboard counts={counts} loading={loading} />
    case 'purchaser': return <PurchaserDashboard counts={counts} loading={loading} />
    case 'bookkeeper': return <BookkeeperDashboard counts={counts} loading={loading} />
    case 'field': default: return <FieldDashboard />
    }
  }, [persona, counts, loading])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {/* Dev role switcher (since auth not wired) */}
        <select value={persona} onChange={e=>{ const v=e.target.value; setRole(v); if (typeof window!=='undefined') localStorage.setItem('role', v) }} className="text-sm border rounded p-1 bg-neutral-950 border-neutral-700">
          <option value="admin">Admin</option>
          <option value="pm">PM</option>
          <option value="purchaser">Purchaser</option>
          <option value="field">Field</option>
          <option value="bookkeeper">Bookkeeper</option>
        </select>
      </div>
      {view}
      <p className="text-xs text-neutral-500">Counts are illustrative – integrate with real status fields / filters for accuracy.</p>
    </div>
  )
}
