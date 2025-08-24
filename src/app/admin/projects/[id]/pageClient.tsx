"use client";
import { Button } from '@/components/ui/Button';
export interface ProjectDetail { id:string; name:string; code:string|null; created_at:string }
export default function ProjectDetailPageClient({ project }: { project: ProjectDetail | null }){
  if(!project) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>{project.name}</h1>
        <Button variant='accent'>Edit</Button>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='sp-card'><p className='text-xs font-medium text-[var(--sp-color-muted)]'>Code</p><p>{project.code || '—'}</p></div>
        <div className='sp-card'><p className='text-xs font-medium text-[var(--sp-color-muted)]'>Created</p><p>{new Date(project.created_at).toLocaleDateString()}</p></div>
      </div>
    </div>
  );
}