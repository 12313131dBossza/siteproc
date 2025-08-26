"use client";
import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

const OPTIONS = ['admin','manager','member','viewer'] as const

export default function RoleSelect({ userId, initialRole, self }: { userId: string; initialRole: string; self: boolean }) {
  const [role,setRole]=useState(initialRole)
  const [pending,setPending]=useState(false)
  const router = useRouter()
  const { push } = useToast()
  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value
    setRole(newRole)
    setPending(true)
    try {
      const res = await fetch('/api/admin/users/role', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, role: newRole }) })
      const data = await res.json().catch(()=>({}))
      if(!res.ok || !data.ok){
        setRole(initialRole)
        const code = data.error || 'update_failed'
        const msg = code === 'invalid_role' ? 'Invalid role' : code === 'cannot_remove_last_admin' ? 'At least one admin required' : code === 'forbidden' ? 'Not allowed' : 'Role update failed'
        push({ title: msg, variant: 'error' })
      } else {
        push({ title: 'Role updated', variant: 'success' })
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }
  return <select disabled={pending || self} value={role} onChange={change} className="bg-neutral-800 rounded px-2 py-1 text-xs">
    {OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}
  </select>
}
