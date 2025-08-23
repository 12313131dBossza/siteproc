"use client"
import React from 'react'

export function Metric({ label, value, loading }: { label: string; value: string | number | null | undefined; loading?: boolean }) {
  return (
    <div className="p-4 rounded border bg-neutral-900/70 border-neutral-700 flex flex-col gap-1 min-h-[90px]">
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{loading ? <span className="animate-pulse text-neutral-500">...</span> : (value ?? '–')}</div>
    </div>
  )
}

export function BigAction({ label, href, onClick, icon }: { label: string; href?: string; onClick?: () => void; icon?: React.ReactNode }) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-lg border bg-gradient-to-br from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 border-neutral-700 transition cursor-pointer text-center p-4">
      <div className="text-4xl">{icon || '⚡'}</div>
      <div className="text-sm font-medium leading-tight">{label}</div>
    </div>
  )
  if (href) return <a href={href} className="block">{inner}</a>
  return <button onClick={onClick} className="block w-full text-left">{inner}</button>
}

export type DashboardCounts = Record<string, number>

export function AdminDashboard({ counts, loading }: { counts: DashboardCounts; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Active Jobs" value={counts.jobs || 0} loading={loading} />
        <Metric label="Users" value={(counts.users ?? counts.quotes) || 0} loading={loading} />
        <Metric label="Monthly Spend" value={`$${((counts.expenses || 0) * 100).toLocaleString()}`} loading={loading} />
      </div>
    </div>
  )
}

export function PMDashboard({ counts, loading }: { counts: DashboardCounts; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="RFQs Awaiting Quotes" value={counts.rfqs || 0} loading={loading} />
        <Metric label="Deliveries Today" value={counts.deliveries || 0} loading={loading} />
        <Metric label="COs Awaiting Approval" value={counts.change_orders || 0} loading={loading} />
      </div>
      <div className="mt-4 border rounded p-4 text-sm bg-neutral-900/50 border-neutral-700">Recent activity feed coming soon.</div>
    </div>
  )
}

export function PurchaserDashboard({ counts, loading }: { counts: DashboardCounts; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="RFQs To Send" value={counts.rfqs || 0} loading={loading} />
        <Metric label="Quotes To Compare" value={counts.quotes || 0} loading={loading} />
        <Metric label="POs Pending Email" value={counts.pos || 0} loading={loading} />
      </div>
    </div>
  )
}

export function FieldDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <BigAction label="Delivery Check-in" href="/deliveries/new" icon={<span>🚚</span>} />
        <BigAction label="New Expense" href="/expenses/new" icon={<span>💸</span>} />
        <BigAction label="Request CO" href="/co/new" icon={<span>📝</span>} />
      </div>
    </div>
  )
}

export function BookkeeperDashboard({ counts, loading }: { counts: DashboardCounts; loading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Unexported Expenses" value={counts.expenses || 0} loading={loading} />
        <Metric label="Unexported POs" value={counts.pos || 0} loading={loading} />
        <div className="flex items-stretch">
          <button className="w-full rounded border bg-neutral-900/70 border-neutral-700 hover:bg-neutral-800 text-sm font-medium" onClick={() => alert('Export coming soon')}>Export CSV</button>
        </div>
      </div>
    </div>
  )
}
