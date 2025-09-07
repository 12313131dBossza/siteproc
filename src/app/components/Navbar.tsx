'use client'
import { useEffect, useState } from 'react'
import { pendingCount } from '@/lib/offline'

export default function Navbar() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw/sw.js').catch(() => {})
    }
    const handler = (e: any) => setCount(e.detail ?? pendingCount())
    window.addEventListener('offline-queue-changed', handler)
    setCount(pendingCount())
    return () => window.removeEventListener('offline-queue-changed', handler)
  }, [])
  return (
    <nav className="w-full p-3 border-b flex items-center justify-between">
      <div className="flex items-center gap-4">
        <a href="/" className="font-semibold">SiteProc</a>
        <a href="/po" className="text-sm underline">POs</a>
  <a href="/order-deliveries" className="text-sm underline">Deliveries</a>
        <a href="/offline/queue" className="text-sm underline">Offline</a>
      </div>
      <div className="flex items-center gap-4 text-sm">
  <a href="/deliveries/new" className="text-sm underline">New Delivery</a>
        <span>Sync pending: <span aria-live="polite">{count}</span></span>
      </div>
    </nav>
  )
}
