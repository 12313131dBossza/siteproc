export const dynamic = 'force-dynamic'
export const revalidate = 0
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import OnboardingClient from './ui'
import { unstable_noStore as noStore } from 'next/cache'

export default async function OnboardingPage() {
  noStore()
  const session = await getSessionProfile()
  if (!session.user) redirect('/login')
  if (session.companyId) redirect('/admin/dashboard')
  return <OnboardingClient />
}

// Client component colocated for simplicity
// Split into its own file if it grows further
// ui.tsx referenced above

