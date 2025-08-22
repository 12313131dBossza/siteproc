"use client"
import { useEffect, useState } from 'react'
import { getQueue, flush, remove, clearQueue } from '@/lib/offline'

export default function OfflineQueuePage() {
  const [items, setItems] = useState(getQueue())
  const [flushing, setFlushing] = useState(false)
  function refresh() { setItems(getQueue()) }
  useEffect(() => { const h = () => refresh(); window.addEventListener('offline-queue-changed', h as any); refresh(); return () => window.removeEventListener('offline-queue-changed', h as any) }, [])
  async function doFlush() { setFlushing(true); try { await flush() } finally { setFlushing(false); refresh() } }
  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Offline Queue</h1>
      <div className="flex gap-2">
        <button onClick={doFlush} disabled={flushing || items.length===0} className="px-3 py-2 bg-black text-white rounded disabled:opacity-50">{flushing? 'Flushing...' : 'Flush Now'}</button>
        <button onClick={()=>clearQueue()} disabled={items.length===0} className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-50">Clear All</button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b"><th className="text-left p-2">Method</th><th className="text-left p-2">URL</th><th className="text-left p-2">Retries</th><th className="p-2"/></tr></thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-b">
              <td className="p-2 font-mono text-xs">{it.method}</td>
              <td className="p-2 break-all text-xs flex-1">{it.url}</td>
              <td className="p-2 text-xs">{it.retries||0}</td>
              <td className="p-2 text-right"><button onClick={()=>remove(it.id)} className="text-red-600 text-xs">Remove</button></td>
            </tr>
          ))}
          {items.length===0 && <tr><td colSpan={4} className="p-4 text-center text-xs text-neutral-500">Queue empty</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
