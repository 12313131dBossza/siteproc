"use client";
import React from 'react';
import { Button } from '@/components/ui/Button';
// ...existing code...

export default function NewProjectPageClient(){
  function submit(e: React.FormEvent){ e.preventDefault(); /* TODO: handle success UI */ location.href='/admin/projects'; }
  return (
    <form onSubmit={submit} className="space-y-5 max-w-xl">
      <h1 className="text-xl font-semibold">New Project</h1>
      <div className="sp-field"><label className="text-xs font-medium">Name</label><input className="sp-input" required /></div>
      <div className="sp-field"><label className="text-xs font-medium">Client</label><input className="sp-input" required /></div>
      <div className="sp-field"><label className="text-xs font-medium">Budget</label><input type='number' className="sp-input" required /></div>
      <Button type='submit'>Save</Button>
    </form>
  );
}