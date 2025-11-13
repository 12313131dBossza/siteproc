import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth';
import { supabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSessionProfile();
    
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const companyId = session.companyId || session.profile?.company_id;
    
    // Get user's actual profile
    const supabase = supabaseService();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Get company info
    const { data: company } = companyId ? await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single() : { data: null };

    // Count data for this company
    const [projects, expenses, payments] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact' }).eq('company_id', companyId || ''),
      supabase.from('expenses').select('*', { count: 'exact' }).eq('company_id', companyId || ''),
      supabase.from('payments').select('*', { count: 'exact' }).eq('company_id', companyId || ''),
    ]);

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      session: {
        companyId: session.companyId,
        profileCompanyId: session.profile?.company_id,
      },
      profile: profile,
      company: company,
      dataCounts: {
        projects: projects.count,
        expenses: expenses.count,
        payments: payments.count,
      },
      firstProject: projects.data?.[0]?.name || 'none',
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
