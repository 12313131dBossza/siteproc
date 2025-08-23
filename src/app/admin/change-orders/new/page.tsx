"use client";
import React, { useState } from 'react';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';
import { changeOrderSchema } from '@/lib/forms';
import { useToast } from '@/components/ui/Toast';

export default function NewChangeOrder(){
  const [step,setStep]=useState(0); const [form,setForm]=useState({ project:'', amountDelta:'', justification:'' }); const [errors,setErrors]=useState<Record<string,string>>({}); const { push }=useToast();
  function validate(){ const safe=changeOrderSchema.safeParse({...form}); if(!safe.success){ const errs:Record<string,string>={}; safe.error.issues.forEach(i=>errs[String(i.path[0])]=i.message); setErrors(errs); return false;} setErrors({}); return true; }
  function next(){ if(validate()) setStep(s=>Math.min(2,s+1)); }
  function prev(){ setStep(s=>Math.max(0,s-1)); }
  function submit(){ if(!validate()) return; push({ title:'Change order submitted (mock)', variant:'success' }); location.href='/admin/change-orders'; }
  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-xl font-semibold">New Change Order</h1>
      <Stepper steps={['Details','Justification','Review']} current={step} />
      {step===0 && <div className="space-y-4">
        <div className="sp-field"><label className="text-xs font-medium">Project</label><input className="sp-input" value={form.project} onChange={e=>setForm(f=>({...f,project:e.target.value}))} />{errors.project && <span className='sp-error'>{errors.project}</span>}</div>
        <div className="sp-field"><label className="text-xs font-medium">Amount Δ</label><input className="sp-input" value={form.amountDelta} onChange={e=>setForm(f=>({...f,amountDelta:e.target.value}))} />{errors.amountDelta && <span className='sp-error'>{errors.amountDelta}</span>}</div>
      </div>}
      {step===1 && <div className="sp-field"><label className="text-xs font-medium">Justification</label><textarea className="sp-input min-h-40" value={form.justification} onChange={e=>setForm(f=>({...f,justification:e.target.value}))} />{errors.justification && <span className='sp-error'>{errors.justification}</span>}</div>}
      {step===2 && <div className="sp-card space-y-2"><pre className="text-xs bg-black/5 p-2 rounded">{JSON.stringify(form,null,2)}</pre></div>}
      <div className="flex gap-2">{step>0 && <Button variant='ghost' onClick={prev}>Back</Button>} {step<2 && <Button onClick={next}>Next</Button>} {step===2 && <Button variant='accent' onClick={submit}>Submit</Button>}</div>
    </div>
  );
}
