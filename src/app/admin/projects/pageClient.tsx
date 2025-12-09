"use client";
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useCurrency } from '@/lib/CurrencyContext';

export interface ProjectRow { 
  id: string; 
  name: string; 
  code: string|null; 
  status?: string; 
  budget?: number 
}

export default function ProjectsPageClient({ rows, error }: { rows: ProjectRow[]; error?: string }){
  const { formatAmount } = useCurrency();
  const [projects, setProjects] = useState<ProjectRow[]>(rows || [])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string>()

  // Try to load from projects API as fallback if server-side failed
  useEffect(() => {
    if ((!rows || rows.length === 0) && !error) {
      setLoading(true)
      fetch('/api/projects', { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(j => {
          if (j?.data) {
            setProjects(j.data)
          } else if (j?.error) {
            setApiError(j.error)
          }
        })
        .catch(e => setApiError(e?.message || 'Failed to load projects'))
        .finally(() => setLoading(false))
    }
  }, [rows, error])

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold'>Projects</h1>
        <Button href='/projects'>View User Projects</Button>
      </div>

      {(error || apiError) && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
          <div className="font-medium mb-1">Error loading projects</div>
          <div className="text-sm">{error || apiError}</div>
          <div className="text-xs mt-2 text-red-600/80">
            The projects module might not be set up yet. Try running the projects migration or use the user-facing projects page.
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading projects...</div>
      ) : (
        <DataTable 
          columns={[
            { key:'id', header:'ID', sortable:true },
            { key:'name', header:'Name', sortable:true },
            { key:'code', header:'Code', sortable:true },
            { key:'status', header:'Status', sortable:true },
            { key:'budget', header:'Budget', render: (row: any) => row.budget ? formatAmount(Number(row.budget)) : '—' }
          ] as any} 
          rows={projects as any} 
          emptyMessage='No projects found. Try creating one or check if the projects migration has been applied.' 
          onRowClick={(r:any)=>location.href='/projects/'+r.id} 
        />
      )}
    </div>
  );
}