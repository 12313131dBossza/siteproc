import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-utils';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    // Use service role client so we can perform admin operations (list users, upsert bypassing RLS)
    const supabase = createServerSupabaseClient();
    const { email, companyName } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Get user from auth system (requires service role)
    const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ error: 'Auth listUsers failed', details: listErr.message }, { status: 500 });
    }
    const authUser = userList.users.find((user: any) => user.email?.toLowerCase() === String(email).toLowerCase());
    
    if (!authUser) {
      return NextResponse.json({ error: 'User not found in auth system' }, { status: 404 });
    }

    // Create or get company
    let company;
    if (companyName) {
      // Try to find existing company first
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', companyName)
        .single();
      
      if (existingCompany) {
        company = existingCompany;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: companyName })
          .select()
          .single();
        
        if (companyError) {
          return NextResponse.json({ 
            error: 'Failed to create company', 
            details: companyError.message 
          }, { status: 500 });
        }
        company = newCompany;
      }
    } else {
      // Get first available company or create default
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .limit(1);
      
      if (companies && companies.length > 0) {
        company = companies[0];
      } else {
        // Create default company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: 'Default Company' })
          .select()
          .single();
        
        if (companyError) {
          return NextResponse.json({ 
            error: 'Failed to create default company', 
            details: companyError.message 
          }, { status: 500 });
        }
        company = newCompany;
      }
    }

    // Create or update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        role: 'member', // Start as member
        company_id: company.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: 'Failed to create/update profile', 
        details: profileError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User setup completed successfully',
      user: {
        id: authUser.id,
        email: authUser.email
      },
      company: {
        id: company.id,
        name: company.name
      },
      profile: profile
    });

  } catch (error) {
    console.error('Setup user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
