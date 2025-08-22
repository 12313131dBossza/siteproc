'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CompareRFQ({ params }: { params: { id: string } }) {
  const [quotes, setQuotes] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/quotes?rfq=${params.id}`)
      const data = await res.json().catch(() => [])
      setQuotes(Array.isArray(data) ? data : [])
    })()
  }, [params.id])

  const select = async (id: string) => {
    setMsg('')
    const cid = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
    const res = await fetch(`/api/quotes/${id}/select`, { method: 'POST', headers: { 'x-company-id': cid } })
    const data = await res.json().catch(()=>null)
    if (res.ok && data?.po_id) {
      setMsg(`PO ${data.po_number} created`)
      router.push(`/po/${data.po_id}`)
    } else {
      setMsg(`Error: ${data?.error || res.statusText}`)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Compare Quotes</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b"><th className="text-left p-2">Supplier</th><th className="text-left p-2">Total</th><th className="text-left p-2">Lead</th><th className="text-left p-2">Terms</th><th/></tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="border-b">
              <td className="p-2">{q.supplier_name || q.supplier_id || '-'}</td>
              <td className="p-2">${'{'}q.total{'}'}</td>
              <td className="p-2">{q.lead_time}</td>
              <td className="p-2">{q.terms}</td>
              <td className="p-2"><button className="px-3 py-1 bg-black text-white rounded" onClick={() => select(q.id)}>Select winner</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  )
}
