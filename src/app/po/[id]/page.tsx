'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabaseAnon } from '@/lib/supabase'
import { usePoRealtime } from '@/lib/usePoRealtime'

export default function PoView() {
  const params = useParams<{ id: string }>()
  const [po, setPo] = useState<any>(null)
  const [err, setErr] = useState<string>('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const id = params?.id
      if (!id) return
      // Validate UUID to avoid hitting the API with placeholders like "PO_ID"
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRe.test(String(id))) {
        setErr('Invalid PO id (expected UUID). If you came from docs, create a PO first.')
        setPo(null)
        return
      }
      const cid = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
      const res = await fetch(`/api/po?id=${id}&detail=1`, { headers: { 'x-company-id': cid } })
      const data = await res.json().catch(()=>({ error: 'Failed to parse response' }))
      if (!res.ok || data?.error) {
        setErr(data?.error || res.statusText)
        setPo(null)
      } else {
        setErr('')
        setPo(data)
      }

    })()
  }, [params])

  // Memoized refetch function for the hook
  const refetch = useCallback(async () => {
    const id = params?.id as string
    if (!id) return
    const cid = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
    const r = await fetch(`/api/po?id=${id}&detail=1`, { headers: { 'x-company-id': cid } })
    const d = await r.json().catch(() => ({}))
    if (r.ok) setPo(d)
  }, [params])

  usePoRealtime(params?.id, refetch)

  async function generatePdf() {
    const id = params?.id as string
    const cid = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`/api/po/${id}/pdf`, { method: 'POST', headers: { 'x-company-id': cid } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || res.statusText)
      // refetch PO to get updated pdf_url
      const r2 = await fetch(`/api/po?id=${id}`, { headers: { 'x-company-id': cid } })
      const d2 = await r2.json().catch(() => ({}))
      if (r2.ok) setPo(d2)
    } catch (e: any) {
      setErr(e.message || 'Failed to generate PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Purchase Order</h1>
      {err && <p className="mt-2 text-sm text-red-600">Error: {err}</p>}
      {po ? (
        <div className="mt-3 space-y-3">
          <div>
            <div>PO Number: {po.po_number}</div>
            <div>Status: {po.status}</div>
          </div>
          {(po.supplier || po.job) && (
            <div className="text-sm text-neutral-300">
              {po.supplier && (
                <div>
                  <span className="font-medium text-neutral-100">Supplier:</span> {po.supplier.name}
                </div>
              )}
              {po.job && (
                <div>
                  <span className="font-medium text-neutral-100">Job:</span> {po.job.name} {po.job.code ? `( ${po.job.code} )` : ''}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="font-medium">Items</div>
            {po.items && po.items.length ? (
              <div className="mt-1 border border-neutral-700 rounded">
                <div className="grid grid-cols-6 gap-2 px-3 py-2 border-b border-neutral-700 text-xs uppercase text-neutral-400">
                  <div className="col-span-3">Description</div>
                  <div>Qty</div>
                  <div>Unit</div>
                  <div>SKU</div>
                </div>
                {po.items.map((it: any) => (
                  <div key={it.id} className="grid grid-cols-6 gap-2 px-3 py-2 text-sm">
                    <div className="col-span-3">{it.description}</div>
                    <div>{Number(it.qty)}</div>
                    <div>{it.unit || ''}</div>
                    <div>{it.sku || ''}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-400">No items.</div>
            )}
          </div>
          {po.pdf_url ? (
            <a className="text-blue-600 underline" href={po.pdf_url} target="_blank">Download PDF</a>
          ) : (
            <button disabled={busy} onClick={generatePdf} className="text-blue-600 underline disabled:opacity-50">
              {busy ? 'Generating…' : 'Generate PDF'}
            </button>
          )}
        </div>
      ) : (
        !err && <p>Loading…</p>
      )}
    </div>
  )
}
