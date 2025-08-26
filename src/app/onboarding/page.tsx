export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'

export default async function OnboardingPage() {
  const session = await getSessionProfile()
  if (!session.user) redirect('/login')
  if (session.companyId) redirect('/admin/dashboard')
  return (
    <div className="mx-auto max-w-lg py-16 space-y-8">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <section className="space-y-3">
        <h2 className="font-medium">Create Company</h2>
        <form action="/api/onboarding/create-company" method="post" className="flex gap-2">
          <input name="name" required placeholder="Company Name" className="flex-1 rounded px-3 py-2 bg-neutral-800" />
          <button className="bg-blue-600 px-4 py-2 rounded text-sm">Create</button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Join Existing Company</h2>
        <form action="/api/onboarding/join-company" method="post" className="flex gap-2">
          <input name="companyId" required placeholder="Company UUID" className="flex-1 rounded px-3 py-2 bg-neutral-800" />
          <button className="bg-green-600 px-4 py-2 rounded text-sm">Join</button>
        </form>
      </section>
    </div>
  )
}
