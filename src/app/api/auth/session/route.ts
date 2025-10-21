import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Debug: Log all cookies
    const allCookies = cookieStore.getAll();
    console.log('[/api/auth/session] Available cookies:', allCookies.map(c => c.name).join(', '));
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              console.error('[/api/auth/session] Error setting cookies:', error);
            }
          },
        },
      }
    );
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('[/api/auth/session] Auth result:', { 
      userExists: !!user, 
      userEmail: user?.email,
      error: error?.message 
    });
    
    if (error || !user) {
      return NextResponse.json({ 
        authenticated: false,
        error: error?.message || 'No user session'
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Session check failed'
    });
  }
}