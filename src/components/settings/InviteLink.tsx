"use client";
import { useState } from 'react'

interface Props { companyId: string; companyName?: string }

export default function InviteLink({ companyId }: Props) {
  const path = `/onboarding?c=${companyId}`
  const [status,setStatus] = useState<'idle'|'copied'|'error'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.origin + path)
      setStatus('copied')
      setTimeout(()=> setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(()=> setStatus('idle'), 2500)
    }
  }
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">Invite Link</label>
      <div className="flex gap-2">
        <input readOnly value={path} className="sp-input flex-1" />
        <button type="button" onClick={copy} className="px-3 py-2 rounded bg-blue-600 text-white text-xs disabled:opacity-50">Copy</button>
      </div>
      {status==='copied' && <p className="text-[11px] text-green-500">Copied!</p>}
      {status==='error' && <p className="text-[11px] text-red-500">Copy failed</p>}
      {status==='idle' && <p className="text-[10px] text-neutral-500">Click Copy to copy full URL.</p>}
    </div>
  )
}
