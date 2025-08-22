"use client"
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [seed, setSeed] = useState<{company_id?: string, job_id?: string, error?: string} | null>(null)
  const [poMsg, setPoMsg] = useState<string>('')

  const runSeed = async () => {
    setSeed({})
    const res = await fetch('/api/dev/seed', { method: 'POST' })
    const data = await res.json().catch(()=>({ error: 'Seed failed' }))
    if (data?.company_id) {
      localStorage.setItem('company_id', data.company_id)
      localStorage.setItem('job_id', data.job_id)
    }
    setSeed(data)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">siteproc</h1>
      <p className="mb-4 text-sm">Quick links</p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><Link className="underline" href="/rfqs/new">Create RFQ</Link></li>
        <li><Link className="underline" href="/deliveries/new">Delivery check-in</Link></li>
        <li><Link className="underline" href="/co/new">New Change Order</Link></li>
      </ul>
      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Local demo seed</h2>
        <p className="text-sm mb-3">Creates a demo company + job in your Supabase DB and stores their IDs in localStorage. Use them to fill forms.</p>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={runSeed}>Create demo company + job</button>
        {seed && (
          <div className="mt-3 text-sm">
            {seed.error ? (
              <p className="text-red-600">Error: {seed.error}</p>
            ) : (
              <>
                <p>Company ID: <code>{seed.company_id}</code></p>
                <p>Job ID: <code>{seed.job_id}</code></p>
                <p className="mt-2">Now paste Job ID into forms (or append <code>?job=...</code> in URLs).</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="border rounded p-4 mt-6">
        <h2 className="font-medium mb-2">One-click demo PO</h2>
        <p className="text-sm mb-3">Creates a company, job, supplier, RFQ, quote and PO, then takes you to the real PO page.</p>
        <button
          className="px-3 py-2 bg-black text-white rounded"
          onClick={async () => {
            setPoMsg('')
            const res = await fetch('/api/dev/demo-po', { method: 'POST' })
            const data = await res.json().catch(() => ({ error: 'Failed to create demo PO' }))
            if (data?.company_id) {
              localStorage.setItem('company_id', data.company_id)
              localStorage.setItem('job_id', data.job_id)
            }
            if (res.ok && data?.po_id) {
              setPoMsg(`Created PO ${data.po_number}`)
              // Navigate to the PO page
              window.location.href = `/po/${data.po_id}`
            } else {
              setPoMsg(`Error: ${data?.error || res.statusText}`)
            }
          }}
        >Create demo PO</button>
        {poMsg && <p className="mt-3 text-sm">{poMsg}</p>}
      </div>
    </div>
  )
}
