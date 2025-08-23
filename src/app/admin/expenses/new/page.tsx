"use client";
import React, { useState } from 'react';
import { expenseSchema } from '@/lib/forms';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function NewExpense(){
  const [form,setForm]=useState({ project:'', category:'', amount:'', date:'' });
  const [errors,setErrors]=useState<Record<string,string>>({});
  const { push } = useToast();
  function submit(e:React.FormEvent){ e.preventDefault(); const safe=expenseSchema.safeParse({...form}); if(!safe.success){ const errs:Record<string,string>={}; safe.error.issues.forEach(i=>{errs[String(i.path[0])]=i.message}); setErrors(errs); return;} push({ title:'Expense saved (mock)', variant:'success' }); location.href='/admin/expenses'; }
  return (
    <form onSubmit={submit} className="space-y-5 max-w-lg">
      <h1 className="text-xl font-semibold">New Expense</h1>
      {['project','category','amount','date'].map(k=> (
        <div className="sp-field" key={k}><label className="text-xs font-medium capitalize">{k}</label><input className="sp-input" value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />{errors[k] && <span className="sp-error">{errors[k]}</span>}</div>
      ))}
      <Button type='submit'>Save</Button>
    </form>
  );
}
