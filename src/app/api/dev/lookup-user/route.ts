import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Allow in development or if a special dev token is provided
  const { searchParams } = new URL(request.url);
  const devToken = searchParams.get('dev_token');
  
  if (process.env.NODE_ENV !== 'development' && devToken !== 'temp_lookup_123') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabase = await sbServer();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // First, let's find the user in auth.users
    const { data: userList } = await supabase.auth.admin.listUsers();
    const authUser = userList.users.find((user: any) => user.email === email);
    
    if (!authUser) {
      return NextResponse.json({ error: 'User not found in auth system' }, { status: 404 });
    }

    // Now check if they have a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, company_id')
      .eq('id', authUser.id)
      .single();

    let companyInfo = null;
    if (profile?.company_id) {
      // Get company details
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .eq('id', profile.company_id)
        .single();
      
      companyInfo = company;
    }

    // Also check if there are any companies in the database
    const { data: allCompanies } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      email,
      authUser: {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at
      },
      profile: profile || null,
      profileError: profileError?.message || null,
      currentCompany: companyInfo,
      availableCompanies: allCompanies || []
    });

  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
