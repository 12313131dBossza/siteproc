import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error('[profile-check] Error setting cookies:', error);
            }
          },
        },
      }
    );
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({
        status: 'error',
        message: 'Not authenticated',
        error: userError?.message
      }, { status: 401 });
    }
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({
        status: 'error',
        message: 'Profile not found',
        userId: user.id,
        error: profileError?.message
      }, { status: 404 });
    }

    // Get companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id);

    return NextResponse.json({
      status: 'ok',
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        company_id: profile.company_id,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      company: companies && companies.length > 0 ? companies[0] : null,
      companiesError: companiesError?.message
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
