import { redirect } from 'next/navigation'

// Placeholder auth check (replace with real session logic later)
async function getSession(): Promise<{ userId: string | null }> {
  // In real app, verify cookies / headers
  return { userId: null }
}

export default async function Landing() {
  const { userId } = await getSession()
  if (userId) redirect('/dashboard')
  redirect('/login')
}
