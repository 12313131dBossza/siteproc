import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 50) + (c.value.length > 50 ? '...' : ''),
      length: c.value.length
    }));
    
    console.log('[session-check] Cookies:', cookieNames);
    
    // Try to create supabase client
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
              console.error('[session-check] Error setting cookies:', error);
            }
          },
        },
      }
    );
    
    console.log('[session-check] Created supabase client');
    
    // Try to get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[session-check] Auth result:', {
      userExists: !!user,
      userEmail: user?.email,
      error: authError?.message
    });
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[session-check] Session result:', {
      sessionExists: !!session,
      sessionUser: session?.user?.email,
      error: sessionError?.message
    });
    
    // Return diagnosis
    return NextResponse.json({
      status: 'ok',
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
      },
      cookies: {
        count: allCookies.length,
        names: cookieNames,
        hasAuthToken: !!allCookies.find(c => c.name.includes('auth-token') || c.name.includes('auth.token')),
        hasRefreshToken: !!allCookies.find(c => c.name.includes('refresh-token') || c.name.includes('refresh_token')),
        allNames: allCookies.map(c => c.name)
      },
      authentication: {
        userEmail: user?.email,
        sessionEmail: session?.user?.email,
        authError: authError?.message,
        sessionError: sessionError?.message,
        isAuthenticated: !!user || !!session
      },
      debug: {
        user: user ? { id: user.id, email: user.email } : null,
        session: session ? { expires_at: session.expires_at } : null
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
