"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage(){
  const [email,setEmail]=useState('')
  const [msg,setMsg]=useState('')
  const router = useRouter()
  async function submit(e:React.FormEvent){
    e.preventDefault()
    setMsg('Signing in (demo)...')
    // Demo: store stub IDs
    if(typeof window!=='undefined'){
      localStorage.setItem('company_id', localStorage.getItem('company_id')||'')
      localStorage.setItem('role', localStorage.getItem('role')||'admin')
    }
    router.replace('/dashboard')
  }
  return <div className="p-6 max-w-sm mx-auto space-y-4">
    <h1 className="text-xl font-semibold">Login</h1>
    <form onSubmit={submit} className="space-y-3">
      <input className="border p-2 w-full rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <button className="w-full py-2 bg-black text-white rounded">Continue</button>
    </form>
    {msg && <p className="text-xs text-neutral-500">{msg}</p>}
  </div>
}
