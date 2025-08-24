import { sbServer } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';
export default async function ClientDetail({ params }: { params: { id: string }}) {
  const supabase = await sbServer();
  const { data, error } = await supabase.from('clients').select('id,name,contact,email,projects').eq('id', params.id).single();
  if(error || !data) return <div>Not found.</div>;
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>{data.name}</h1>
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Contact</p><p>{data.contact || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Email</p><p>{data.email || '—'}</p></div>
        <div className='sp-card'><p className='text-xs text-[var(--sp-color-muted)]'>Projects</p><p>{data.projects ?? 0}</p></div>
      </div>
    </div>
  );
}
