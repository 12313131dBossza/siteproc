import Link from 'next/link'

export default function AdminOnly({ message = 'Admins only' }: { message?: string }) {
  return (
    <div className="p-6 rounded border border-neutral-800 bg-neutral-900 space-y-3 max-w-md">
      <h2 className="text-sm font-semibold">{message}</h2>
      <p className="text-xs text-neutral-400">You do not have permission to view this page.</p>
      <Link href="/admin/dashboard" className="inline-block text-xs px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700">Return to dashboard</Link>
    </div>
  )
}
