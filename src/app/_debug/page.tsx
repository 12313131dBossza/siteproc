export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'

export default async function DebugProfilePage() {
  noStore()
  const res = await fetch('/api/_debug/profile', { cache: 'no-store' })
  const j = await res.json().catch(()=>null)
  return <pre style={{ padding: 20 }}>{JSON.stringify(j, null, 2)}</pre>
}