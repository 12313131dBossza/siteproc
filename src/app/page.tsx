import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function RootPage() {
  // Check if user is logged in
  const cookieStore = cookies()
  const hasSession = cookieStore.get('sb-access-token') || cookieStore.get('supabase-auth-token')
  
  // If logged in, go to dashboard
  if (hasSession) {
    redirect('/dashboard')
  }
  
  // Otherwise show landing page
  redirect('/landing')
}
