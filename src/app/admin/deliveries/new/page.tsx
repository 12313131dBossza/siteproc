"use client";
import React, { useState } from 'react';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';
import { deliverySchema } from '@/lib/forms';
import { useToast } from '@/components/ui/Toast';

export default function NewDeliveryPage(){
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({ project:'', eta:'', carrier:'' });
  const [errors,setErrors]=useState<Record<string,string>>({});
  const { push } = useToast();

  function validateCurrent(): boolean {
    let partial: any = {};
    if(step===0) partial = { project: form.project||'' , eta: 'dummy', carrier: 'dummy' };
    if(step===1) partial = { project: 'dummy', eta: form.eta||'', carrier: 'dummy' };
    if(step===2) partial = { project: 'dummy', eta: 'dummy', carrier: form.carrier||'' };
    const safe = deliverySchema.safeParse({...form});
    if(!safe.success){
      const errs: Record<string,string> = {};
      safe.error.issues.forEach(i=>{ if(i.path[0]) errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return false;
    }
    setErrors({}); return true;
  }
  function next(){ if(validateCurrent()) setStep(s=>Math.min(3,s+1)); }
  function prev(){ setStep(s=>Math.max(0,s-1)); }
  function submit(){ const safe = deliverySchema.safeParse(form); if(!safe.success){ validateCurrent(); return; } push({ title:'Delivery created (mock)', variant:'success' }); location.href='/admin/deliveries'; }

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-xl font-semibold">New Delivery</h1>
      <Stepper steps={["Project","Schedule","Carrier","Review"]} current={step} />
      {step===0 && <div className="sp-field"><label className="text-xs font-medium">Project</label><input className="sp-input" value={form.project} onChange={e=>setForm(f=>({...f,project:e.target.value}))} />{errors.project && <span className="sp-error">{errors.project}</span>}</div>}
      {step===1 && <div className="sp-field"><label className="text-xs font-medium">ETA</label><input className="sp-input" value={form.eta} onChange={e=>setForm(f=>({...f,eta:e.target.value}))} />{errors.eta && <span className="sp-error">{errors.eta}</span>}</div>}
      {step===2 && <div className="sp-field"><label className="text-xs font-medium">Carrier</label><input className="sp-input" value={form.carrier} onChange={e=>setForm(f=>({...f,carrier:e.target.value}))} />{errors.carrier && <span className="sp-error">{errors.carrier}</span>}</div>}
      {step===3 && <div className="sp-card space-y-2"><p className="text-sm">Review</p><pre className="text-xs bg-black/5 p-2 rounded">{JSON.stringify(form,null,2)}</pre></div>}
      <div className="flex gap-2">{step>0 && <Button variant='ghost' onClick={prev}>Back</Button>} {step<3 && <Button onClick={next}>Next</Button>} {step===3 && <Button variant='accent' onClick={submit}>Create</Button>}</div>
    </div>
  );
}
