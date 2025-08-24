"use client";
import React from 'react';
import { projects } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';

export default function ProjectDetailPageClient({ params }: { params: { id: string }}) {
  const project = projects.find(p=>p.id===params.id);
  if(!project) return <div>Not found.</div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <Button variant='accent'>Edit</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="sp-card"><p className="text-xs font-medium text-[var(--sp-color-muted)]">Client</p><p>{project.client}</p></div>
        <div className="sp-card"><p className="text-xs font-medium text-[var(--sp-color-muted)]">Status</p><p>{project.status}</p></div>
        <div className="sp-card"><p className="text-xs font-medium text-[var(--sp-color-muted)]">Budget</p><p>${project.budget.toLocaleString()}</p></div>
      </div>
      <div className="sp-card space-y-3">
        <h3 className="text-sm font-semibold">Timeline</h3>
        <ul className="text-xs space-y-1">
          <li>Start: {project.startDate}</li>
          {project.endDate && <li>End: {project.endDate}</li>}
        </ul>
      </div>
    </div>
  );
}