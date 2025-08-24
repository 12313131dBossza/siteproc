"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
export interface ProjectRow { id:string; name:string; code:string|null }
export default function ProjectsPageClient({ rows }: { rows: ProjectRow[] }){
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Projects</h1>
        <Button href='/admin/projects/new'>New Project</Button>
      </div>
      <DataTable columns={[
        { key:'id', header:'ID', sortable:true },
        { key:'name', header:'Name', sortable:true },
        { key:'code', header:'Code', sortable:true }
      ] as any} rows={rows as any} emptyMessage='No projects.' onRowClick={(r:any)=>location.href='/admin/projects/'+r.id} />
    </div>
  );
}