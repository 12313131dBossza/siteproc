"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// NOTE: This page was previously a mock. It now calls the real /api/expenses endpoint.
// Required headers: x-company-id and x-role (bookkeeper or higher). We pull company / role
// from localStorage fallback so demo still works. Adjust as you add auth.

export default function NewExpense(){
  const [jobId,setJobId]=useState("");
  const [amount,setAmount]=useState("");
  const [date,setDate]=useState(""); // YYYY-MM-DD
  const [memo,setMemo]=useState("");
  const [loading,setLoading]=useState(false);
  const { push } = useToast();

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!jobId || !amount || !date){
      push({ title:"Fill all required fields", variant:"error" });
      return;
    }
    setLoading(true);
    try {
      const cid = (typeof window!=="undefined" && (localStorage.getItem('company_id')||process.env.NEXT_PUBLIC_COMPANY_ID)) || '';
      const role = (typeof window!=="undefined" && (localStorage.getItem('role')||'bookkeeper')) || 'bookkeeper';
      const res = await fetch('/api/expenses', {
        method:'POST',
        headers:{ 'content-type':'application/json','x-company-id':cid,'x-role':role },
        body: JSON.stringify({ job_id: jobId, amount: Number(amount), spent_at: date, memo: memo || undefined })
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok){
        push({ title:'Expense created', variant:'success' });
        setAmount(''); setMemo('');
        // Redirect back to list so server component refetches fresh DB rows.
        setTimeout(()=>{ location.href='/admin/expenses'; }, 350);
      } else {
        push({ title:data?.error || 'Create failed', variant:'error' });
      }
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-lg">
      <h1 className="text-xl font-semibold">New Expense</h1>
      <div className="sp-field">
        <label className="text-xs font-medium">Job ID *</label>
        <input className="sp-input" value={jobId} onChange={e=>setJobId(e.target.value)} placeholder="uuid of job" />
      </div>
      <div className="sp-field">
        <label className="text-xs font-medium">Amount *</label>
        <input className="sp-input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
      </div>
      <div className="sp-field">
        <label className="text-xs font-medium">Date (YYYY-MM-DD) *</label>
        <input className="sp-input" value={date} onChange={e=>setDate(e.target.value)} />
      </div>
      <div className="sp-field">
        <label className="text-xs font-medium">Memo</label>
        <input className="sp-input" value={memo} onChange={e=>setMemo(e.target.value)} />
      </div>
      <Button type='submit' disabled={loading}>{loading?'Saving…':'Save'}</Button>
    </form>
  );
}
