"use client";
import Link from 'next/link'

export default function SettingsError({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-neutral-400 break-all">{error?.message || 'Unknown error'}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-3 py-2 rounded bg-blue-600 text-xs">Try again</button>
  <Link href="/dashboard" className="px-3 py-2 rounded bg-neutral-800 text-xs">Back to Dashboard</Link>
      </div>
    </div>
  )
}