"use client"
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OnboardingClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [createName, setCreateName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [errorCreate, setErrorCreate] = useState<string | null>(null)
  const [errorJoin, setErrorJoin] = useState<string | null>(null)

  // Auto-fill company ID from invite link (e.g., /onboarding?c=COMPANY_ID)
  useEffect(() => {
    const companyId = searchParams.get('c')
    if (companyId) {
      setJoinId(companyId)
    }
  }, [searchParams])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) return
    setErrorCreate(null)
    setCreating(true)
    try {
      const res = await fetch('/api/onboarding/create-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim() })
      })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) {
        setErrorCreate(data.error || 'Failed to create company')
      } else {
  router.replace('/dashboard')
  router.refresh()
      }
    } catch (err: any) {
      setErrorCreate(err.message || 'Network error')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinId.trim()) return
    setErrorJoin(null)
    setJoining(true)
    try {
      const res = await fetch('/api/onboarding/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: joinId.trim() }),
        cache: 'no-store'
      })
      const data = await res.json().catch(()=>({}))
      if (res.ok && data?.ok) {
  router.replace('/dashboard')
  router.refresh()
        return
      }
      const code = data?.error
      if (code === 'not_found') setErrorJoin('Company not found')
      else if (code === 'cannot_remove_last_admin') setErrorJoin('You are the last admin of your current company. Assign another admin before leaving.')
      else if (code === 'invalid_body') setErrorJoin('Invalid company id')
  else if (code === 'update_failed') setErrorJoin('Join failed, please retry in a moment.')
  else setErrorJoin(code || 'Failed to join company')
    } catch (err: any) {
      setErrorJoin(err.message || 'Network error')
    } finally {
      setJoining(false)
    }
  }

  const hasInviteLink = !!searchParams.get('c')

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="mx-auto max-w-2xl w-full space-y-8 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Welcome to SiteProc
          </h1>
          <p className="text-neutral-400 text-sm md:text-base">
            {hasInviteLink 
              ? "You've been invited to join a company. Accept the invitation below to get started."
              : "Let's get you set up. Create a new company or join an existing one."}
          </p>
        </div>

        {/* Join Company Section (prioritized if invite link) */}
        {hasInviteLink && (
          <section className="space-y-4 p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-white">You're Invited!</h2>
                <p className="text-sm text-neutral-400">Accept invitation to join the company</p>
              </div>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Company ID</label>
                <input 
                  value={joinId} 
                  onChange={e=>setJoinId(e.target.value)} 
                  required 
                  placeholder="Company UUID" 
                  className="w-full rounded-lg px-4 py-3 bg-neutral-800 border border-neutral-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm"
                  readOnly
                />
              </div>
              <button 
                disabled={joining} 
                className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joining ? 'Joining...' : 'Accept Invitation & Join'}
              </button>
              {errorJoin && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-400">{errorJoin}</p>
                </div>
              )}
            </form>
          </section>
        )}

        {/* Divider */}
        {hasInviteLink && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-neutral-900/50 text-neutral-500">Or create your own company</span>
            </div>
          </div>
        )}

        {/* Create Company Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-white">Create New Company</h2>
              <p className="text-sm text-neutral-400">Start fresh with your own company</p>
            </div>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Company Name</label>
              <input 
                value={createName} 
                onChange={e=>setCreateName(e.target.value)} 
                required 
                placeholder="e.g., ABC Construction" 
                className="w-full rounded-lg px-4 py-3 bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
              />
            </div>
            <button 
              disabled={creating} 
              className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Create Company'}
            </button>
            {errorCreate && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{errorCreate}</p>
              </div>
            )}
          </form>
        </section>

        {/* Join Existing Company (manual) - only show if no invite link */}
        {!hasInviteLink && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-neutral-900/50 text-neutral-500">Or join existing company</span>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-white">Join Existing Company</h2>
                  <p className="text-sm text-neutral-400">Enter company ID to join</p>
                </div>
              </div>
              <form onSubmit={handleJoin} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Company ID</label>
                  <input 
                    value={joinId} 
                    onChange={e=>setJoinId(e.target.value)} 
                    required 
                    placeholder="Paste company ID here" 
                    className="w-full rounded-lg px-4 py-3 bg-neutral-800 border border-neutral-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm font-mono"
                  />
                  <p className="text-xs text-neutral-500">Ask your admin for an invite link or company ID</p>
                </div>
                <button 
                  disabled={joining} 
                  className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {joining ? 'Joining...' : 'Join Company'}
                </button>
                {errorJoin && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-400">{errorJoin}</p>
                  </div>
                )}
              </form>
            </section>
          </>
        )}

        {/* Help Text */}
        <div className="pt-6 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-500">
            Need help? Contact your administrator or{' '}
            <a href="mailto:support@siteproc.com" className="text-blue-400 hover:text-blue-300 underline">
              support@siteproc.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
