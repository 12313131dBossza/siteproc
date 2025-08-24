import { sbServer } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';
export default async function ContractorDetail({ params }: { params: { id: string }}) {
  const supabase = await sbServer();
  const { data, error } = await supabase.from('suppliers').select('id,name,email,phone,created_at').eq('id', params.id).single();
  if(error || !data) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>{data.name}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Email</p><p>{data.email || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Phone</p><p>{data.phone || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Created</p><p>{new Date(data.created_at).toLocaleDateString()}</p></div>
      </div>
    </div>
  );
}
