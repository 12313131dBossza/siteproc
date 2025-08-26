export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const session = await getSessionProfile()
  if (session.user && session.companyId) redirect('/dashboard')
  // Removed onboarding redirect; single guard lives in /dashboard layout
  return <LoginForm />
}
