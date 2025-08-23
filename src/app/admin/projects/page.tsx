export const dynamic = 'force-dynamic';
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { projects } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';

export default function ProjectsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Button onClick={()=>location.href='/admin/projects/new'}>New Project</Button>
      </div>
      <DataTable columns={[
        { key:'id', header:'ID', sortable:true },
        { key:'name', header:'Name', sortable:true },
        { key:'client', header:'Client', sortable:true },
        { key:'status', header:'Status', sortable:true },
        { key:'budget', header:'Budget', sortable:true },
      ]} rows={projects as any} onRowClick={(r:any)=> location.href='/admin/projects/'+r.id} />
    </div>
  );
}
