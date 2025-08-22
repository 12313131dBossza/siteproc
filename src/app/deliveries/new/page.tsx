'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { compressDataUrl, enqueue, installAutoFlush, pendingCount } from '@/lib/offline'

export default function DeliveryNew() {
  const sp = useSearchParams()
  const [count, setCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  useEffect(() => {
    installAutoFlush()
    const h = () => setCount(pendingCount())
    window.addEventListener('offline-queue-changed', h as any)
    setCount(pendingCount())
    return () => window.removeEventListener('offline-queue-changed', h as any)
  }, [])

  const submit = async (e: any) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)
    const files = (data.getAll('photos') as File[])
    const photos: string[] = []
    for (const f of files) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(f)
      })
      photos.push(await compressDataUrl(dataUrl))
    }
    const payload = {
      job_id: String(data.get('job_id') || sp.get('job') || ''),
      po_id: sp.get('po') || undefined,
      signer_name: String(data.get('signer_name') || ''),
      notes: String(data.get('notes') || ''),
      items: [{ description: 'Materials', qty: Number(data.get('qty')||1) }],
      photo_data_urls: photos,
      signature_data_url: canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined,
    }
  const cid = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || '00000000-0000-0000-0000-000000000000'
  const req = { url: '/api/deliveries', method: 'POST', headers: { 'content-type': 'application/json', 'x-company-id': cid }, body: payload }
    if (!navigator.onLine) { enqueue(req); return }
    const res = await fetch(req.url, { method: req.method, headers: req.headers, body: JSON.stringify(req.body) })
    if (!res.ok) enqueue(req)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Delivery Check-in</h1>
      <form onSubmit={submit} className="space-y-3">
  <label className="block">Job ID<input className="border p-2 w-full" name="job_id" placeholder="uuid" defaultValue={sp.get('job') || ''}/></label>
        <label className="block">Qty<input className="border p-2 w-full" name="qty" type="number" step="0.01" defaultValue={1}/></label>
        <label className="block">Signer<input className="border p-2 w-full" name="signer_name"/></label>
        <label className="block">Notes<textarea className="border p-2 w-full" name="notes"/></label>
        <div>
          <div className="mb-1 text-sm">Signature</div>
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            className="border w-full bg-white"
            onMouseDown={(e)=>{drawing.current=true; const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d')!; ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}}
            onMouseUp={()=>{drawing.current=false}}
            onMouseMove={(e)=>{if(!drawing.current) return; const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d')!; ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle='#000'; ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke()}}
          />
          <button type="button" className="mt-2 text-sm underline" onClick={()=>{ const c=canvasRef.current; if(c){ const ctx=c.getContext('2d')!; ctx.clearRect(0,0,c.width,c.height)} }}>Clear</button>
        </div>
        <label className="block">Photos<input className="border p-2 w-full" name="photos" type="file" accept="image/*" multiple capture="environment"/></label>
        <button className="w-full py-2 bg-black text-white rounded">Submit</button>
      </form>
      <div aria-live="polite" className="mt-3 text-sm">Sync pending: {count}</div>
    </div>
  )
}
