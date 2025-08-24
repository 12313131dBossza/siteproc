"use client";
import DataTable from '@/components/ui/DataTable';
export interface ContractorRow { id:string; name:string; email:string|null; phone:string|null }
export default function ContractorsPageClient({ rows }: { rows: ContractorRow[] }){
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Contractors</h1>
      <DataTable columns={[
        { key:'name', header:'Name', sortable:true },
        { key:'email', header:'Email' },
        { key:'phone', header:'Phone' }
      ] as any} rows={rows as any} emptyMessage='No contractors.' onRowClick={(r:any)=>location.href='/admin/contractors/'+r.id} />
    </div>
  );
}