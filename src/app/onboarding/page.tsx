export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import OnboardingClient from './ui'

export default async function OnboardingPage() {
  const session = await getSessionProfile()
  if (!session.user) redirect('/login')
  if (session.companyId) redirect('/admin/dashboard')
  return <OnboardingClient />
}

// Client component colocated for simplicity
// Split into its own file if it grows further
// ui.tsx referenced above

