export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSessionProfile, getSupabaseServer } from '@/lib/auth'

export default async function LoginPage() {
  const session = await getSessionProfile()
  if (session.user && session.companyId) redirect('/admin/dashboard')
  if (session.user && !session.companyId) redirect('/onboarding')
  return (
    <div className="mx-auto max-w-sm py-16 space-y-6">
      <h1 className="text-xl font-semibold">Login</h1>
      <form action="/login" method="post" className="space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded px-3 py-2 bg-neutral-800" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded px-3 py-2 bg-neutral-800" />
        <button formAction="/login/email" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm">Sign In</button>
      </form>
    </div>
  )
}

export async function POST(req: Request) {
  const form = await req.formData()
  const email = String(form.get('email')||'').trim()
  const password = String(form.get('password')||'')
  const supabase = getSupabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return new Response('Login failed', { status: 400 })
  return new Response(null, { status: 302, headers: { Location: '/admin/dashboard' } })
}
