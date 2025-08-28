'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
const ClientToaster = dynamic(() => import('@/components/providers/ClientToaster'), { ssr: false })
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
  const supabase = createClient(supabaseUrl, anon, { auth: { persistSession: true } })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const em = email.trim()
    if (!em) { 
      toast.error('Enter an email')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: em, 
        options: { emailRedirectTo: `${appUrl}/auth/callback` } 
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Magic link sent (check inbox)')
      }
    } catch (err: any) {
      toast.error(err.message || 'Unexpected error')
    } finally { 
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto space-y-6">
      <ClientToaster />
      <h1 className="text-2xl font-semibold">Login</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            className="sp-input w-full" 
            placeholder="you@example.com" 
          />
        </label>
        <button 
          disabled={loading} 
          className="sp-btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
      <p className="text-xs text-neutral-500">
        We'll email you a magic sign-in link. No password required.
      </p>
    </div>
  )
}
