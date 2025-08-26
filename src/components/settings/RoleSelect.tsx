"use client";
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RoleSelect({ userId, initialRole, self }: { userId: string; initialRole: string; self: boolean }) {
  const [role,setRole]=useState(initialRole)
  const [pending,setPending]=useState(false)
  const router = useRouter()
  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value
    setRole(newRole)
    setPending(true)
    try {
      const res = await fetch('/api/settings/members/role', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, role: newRole }) })
      if(!res.ok){ setRole(initialRole); }
      else router.refresh()
    } finally {
      setPending(false)
    }
  }
  return <select disabled={pending || self} value={role} onChange={change} className="bg-neutral-800 rounded px-2 py-1 text-xs">
    <option value="viewer">viewer</option>
    <option value="admin">admin</option>
  </select>
}
