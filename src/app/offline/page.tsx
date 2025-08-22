"use client"
import { useEffect, useState } from 'react'
import { flush } from '@/lib/offline'

interface Item { id: string; url: string; method: string; retries?: number }

export default function OfflineQueuePage() {
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)

  function load() {
    try {
      const raw = localStorage.getItem('offline_queue_v1')
      setItems(raw ? JSON.parse(raw) : [])
    } catch { setItems([]) }
  }

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('offline-queue-changed', handler as any)
    return () => window.removeEventListener('offline-queue-changed', handler as any)
  }, [])

  function remove(id: string) {
    const next = items.filter(i => i.id !== id)
    localStorage.setItem('offline_queue_v1', JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: next.length }))
    setItems(next)
  }

  async function retryAll() {
    setBusy(true)
    await flush()
    load()
    setBusy(false)
  }

  function clearAll() {
    localStorage.removeItem('offline_queue_v1')
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: 0 }))
    setItems([])
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold">Offline Queue</h1>
      <div className="flex gap-2 flex-wrap">
        <button onClick={retryAll} disabled={busy} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{busy ? 'Retrying...' : 'Retry Failed'}</button>
        <button onClick={clearAll} className="px-3 py-2 bg-gray-200 rounded">Clear All</button>
        <button onClick={load} className="px-3 py-2 bg-gray-200 rounded">Refresh</button>
      </div>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-2">Method</th>
            <th className="p-2">URL</th>
            <th className="p-2">Retries</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Queue empty</td></tr>}
          {items.map(it => (
            <tr key={it.id} className="border-t">
              <td className="p-2 font-mono text-xs">{it.method}</td>
              <td className="p-2 break-all max-w-xs">{it.url}</td>
              <td className="p-2 text-center">{it.retries || 0}</td>
              <td className="p-2"><button onClick={() => remove(it.id)} className="text-red-600 text-xs underline">Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">Items retry up to 5 times automatically when back online. Manage or clear them here.</p>
    </div>
  )
}
