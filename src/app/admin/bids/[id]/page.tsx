import { sbServer } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';
export default async function BidDetail({ params }: { params: { id: string }}) {
  const supabase = await sbServer();
  const { data, error } = await supabase
    .from('quotes')
    .select('id, status, total, supplier_id, rfq_id, created_at')
    .eq('id', params.id)
    .single();
  if(error || !data) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Bid {data.id}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Supplier</p><p>{data.supplier_id?.slice(0,8) || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Amount</p><p>${data.total ?? '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Status</p><p>{data.status}</p></div>
      </div>
      <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Submitted</p><p>{new Date(data.created_at).toLocaleString()}</p></div>
    </div>
  );
}
