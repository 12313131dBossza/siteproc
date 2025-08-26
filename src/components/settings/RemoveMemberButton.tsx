"use client";
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RemoveMemberButton({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [pending,setPending]=useState(false)
  const router = useRouter()
  async function remove() {
    if (disabled) return
    if(!confirm('Remove this member from the company?')) return
    setPending(true)
    try {
      const res = await fetch('/api/settings/members/remove', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId }) })
      if(res.ok) router.refresh()
    } finally { setPending(false) }
  }
  return <button type="button" disabled={pending||disabled} onClick={remove} className="text-xs px-2 py-1 rounded bg-neutral-700 disabled:opacity-40">Remove</button>
}
