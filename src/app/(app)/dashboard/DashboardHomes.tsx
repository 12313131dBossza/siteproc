"use client"
import React, { useState, useCallback, useEffect, ReactNode } from 'react'
import useDashboardRealtime from '@/lib/useDashboardRealtime'

export function Metric({ label, value, loading }: { label: string; value: string | number | null | undefined; loading?: boolean }) {
  return (
    <div className="p-4 rounded border bg-neutral-900/70 border-neutral-700 flex flex-col gap-1 min-h-[90px]">
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{loading ? <span className="animate-pulse text-neutral-500">…</span> : (value ?? '–')}</div>
    </div>
  )
}

export function BigAction({ label, href, icon }: { label: string; href: string; icon?: ReactNode }) {
  return (
    <a href={href} className="block">
      <div className="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-lg border bg-gradient-to-br from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 border-neutral-700 transition cursor-pointer text-center p-4">
        <div className="text-4xl">{icon || '⚡'}</div>
        <div className="text-sm font-medium leading-tight">{label}</div>
      </div>
    </a>
  )
}

// Optional developer tools panel (seed + demo PO) gated by env var + local switch.
export function DevToolsPanel() {
  const enabled = process.env.NEXT_PUBLIC_DEV_TOOLS === 'true'
  const [seedMsg, setSeedMsg] = useState<string>('')
  const [poMsg, setPoMsg] = useState<string>('')
  if (!enabled) return null
  return (
    <div className="border rounded p-4 space-y-4">
      <div>
        <h2 className="font-medium mb-1">Local demo seed</h2>
        <p className="text-xs mb-2 text-neutral-400">Creates demo company + job and stores IDs in localStorage.</p>
        <button
          className="px-3 py-1.5 bg-black text-white rounded text-sm"
          onClick={async () => {
            setSeedMsg('Seeding…')
            const res = await fetch('/api/dev/seed', { method: 'POST' })
            const data = await res.json().catch(() => ({ error: 'Failed' }))
            if (data?.company_id) {
              localStorage.setItem('company_id', data.company_id)
              localStorage.setItem('job_id', data.job_id)
              setSeedMsg(`Seeded company ${data.company_id.slice(0,8)}…`)
            } else setSeedMsg(`Error: ${data?.error}`)
          }}
        >Create demo company + job</button>
        {seedMsg && <p className="text-xs mt-2" aria-live="polite">{seedMsg}</p>}
      </div>
      <div>
        <h2 className="font-medium mb-1">One‑click demo PO</h2>
        <p className="text-xs mb-2 text-neutral-400">Creates company, job, supplier, RFQ, quote & PO.</p>
        <button
          className="px-3 py-1.5 bg-black text-white rounded text-sm"
          onClick={async () => {
            setPoMsg('Working…')
            const res = await fetch('/api/dev/demo-po', { method: 'POST' })
            const data = await res.json().catch(() => ({ error: 'Failed' }))
            if (res.ok && data?.po_id) {
              localStorage.setItem('company_id', data.company_id)
              localStorage.setItem('job_id', data.job_id)
              setPoMsg(`Created PO ${data.po_number}`)
              window.location.href = `/po/${data.po_id}`
            } else setPoMsg(`Error: ${data?.error || res.statusText}`)
          }}
        >Create demo PO</button>
        {poMsg && <p className="text-xs mt-2" aria-live="polite">{poMsg}</p>}
      </div>
    </div>
  )
}

export function AdminHome({ companyId }: { companyId?: string }) {
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t+1), [])
  useDashboardRealtime(companyId || (typeof window!=='undefined' ? localStorage.getItem('company_id') || undefined : undefined), refetch)
  return (
    <div className="space-y-6" data-refresh={tick}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Active Jobs" value={0} />
        <Metric label="Users" value={0} />
        <Metric label="Monthly Spend" value="$0" />
      </div>
      <DevToolsPanel />
    </div>
  )
}

export function PMHome({ companyId }: { companyId?: string }) {
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t+1), [])
  useDashboardRealtime(companyId || (typeof window!=='undefined' ? localStorage.getItem('company_id') || undefined : undefined), refetch)
  return (
    <div className="space-y-6" data-refresh={tick}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="RFQs Awaiting Quotes" value={0} />
        <Metric label="Deliveries Today" value={0} />
        <Metric label="COs Awaiting Approval" value={0} />
      </div>
      <DevToolsPanel />
    </div>
  )
}

export function PurchaserHome({ companyId }: { companyId?: string }) {
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t+1), [])
  useDashboardRealtime(companyId || (typeof window!=='undefined' ? localStorage.getItem('company_id') || undefined : undefined), refetch)
  return (
    <div className="space-y-6" data-refresh={tick}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="RFQs To Send" value={0} />
        <Metric label="Quotes To Compare" value={0} />
        <Metric label="POs Pending Email" value={0} />
      </div>
      <DevToolsPanel />
    </div>
  )
}

export function FieldHome({ companyId }: { companyId?: string }) {
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t+1), [])
  useDashboardRealtime(companyId || (typeof window!=='undefined' ? localStorage.getItem('company_id') || undefined : undefined), refetch)
  return (
    <div className="space-y-6" data-refresh={tick}>
      <div className="grid gap-4 sm:grid-cols-3">
        <BigAction label="Delivery check-in" href="/deliveries/new" icon={<span>🚚</span>} />
        <BigAction label="New expense" href="/expenses/new" icon={<span>💸</span>} />
        <BigAction label="Request change order" href="/co/new" icon={<span>📝</span>} />
      </div>
      <DevToolsPanel />
    </div>
  )
}

export function BookkeeperHome({ companyId }: { companyId?: string }) {
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t+1), [])
  useDashboardRealtime(companyId || (typeof window!=='undefined' ? localStorage.getItem('company_id') || undefined : undefined), refetch)
  return (
    <div className="space-y-6" data-refresh={tick}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Unexported Expenses" value={0} />
        <Metric label="Unexported POs" value={0} />
        <div className="flex items-stretch">
          <button className="w-full rounded border bg-neutral-900/70 border-neutral-700 hover:bg-neutral-800 text-sm font-medium" onClick={()=>alert('Export coming soon')}>Export CSV</button>
        </div>
      </div>
      <DevToolsPanel />
    </div>
  )
}
