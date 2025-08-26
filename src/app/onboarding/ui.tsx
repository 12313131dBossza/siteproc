"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingClient() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [createName, setCreateName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [errorCreate, setErrorCreate] = useState<string | null>(null)
  const [errorJoin, setErrorJoin] = useState<string | null>(null)

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
        router.replace('/admin/dashboard')
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
        router.replace('/admin/dashboard')
        router.refresh()
        return
      }
      const code = data?.error
      if (code === 'not_found') setErrorJoin('Company not found')
      else if (code === 'cannot_remove_last_admin') setErrorJoin('You are the last admin of your current company. Assign another admin before leaving.')
      else if (code === 'invalid_body') setErrorJoin('Invalid company id')
      else setErrorJoin(code || 'Failed to join company')
    } catch (err: any) {
      setErrorJoin(err.message || 'Network error')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-16 space-y-8">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <section className="space-y-3">
        <h2 className="font-medium">Create Company</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input value={createName} onChange={e=>setCreateName(e.target.value)} required placeholder="Company Name" className="flex-1 rounded px-3 py-2 bg-neutral-800" />
            <button disabled={creating} className="bg-blue-600 px-4 py-2 rounded text-sm disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
          </div>
          {errorCreate && <p className="text-sm text-red-400">{errorCreate}</p>}
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Join Existing Company</h2>
        <form onSubmit={handleJoin} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input value={joinId} onChange={e=>setJoinId(e.target.value)} required placeholder="Company UUID" className="flex-1 rounded px-3 py-2 bg-neutral-800" />
            <button disabled={joining} className="bg-green-600 px-4 py-2 rounded text-sm disabled:opacity-50">{joining ? 'Joining...' : 'Join'}</button>
          </div>
          {errorJoin && <p className="text-sm text-red-400">{errorJoin}</p>}
        </form>
      </section>
    </div>
  )
}
