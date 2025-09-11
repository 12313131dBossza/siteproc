import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    console.log('[exchange-code] Starting code exchange');
    console.log('[exchange-code] Environment check:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    });
    
    const { code, rememberMe } = await req.json();
    
    console.log('[exchange-code] Received code:', code ? 'present' : 'missing');
    console.log('[exchange-code] Remember me:', rememberMe);
    
    if (!code) {
      console.error('[exchange-code] Missing code');
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const cookieStore = await cookies();
    
    // Configure cookie options based on remember me preference
    const cookieOptions = rememberMe ? {
      // For remember me: 30 days
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    } : {
      // For normal login: session cookie (expires when browser closes)
      maxAge: undefined,
    };
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Apply remember me options to auth cookies
                const finalOptions = name.includes('supabase') && rememberMe ? 
                  { ...options, ...cookieOptions } : options;
                cookieStore.set(name, value, finalOptions)
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    console.log('[exchange-code] Supabase client created');
    
    // Try to exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[exchange-code] Exchange error:', error.message);
      
      // If PKCE challenge fails, try alternative approach
      if (error.message.includes('code challenge') || error.message.includes('code verifier')) {
        console.log('[exchange-code] PKCE challenge failed, clearing auth state and redirecting to re-login');
        
        // Clear any existing session
        await supabase.auth.signOut();
        
        return NextResponse.json({ 
          error: 'Authentication session expired. Please try logging in again.',
          shouldRedirect: true 
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[exchange-code] Code exchange successful, user:', data.user?.email);
    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error('[exchange-code] Exception:', err?.message);
    return NextResponse.json({ error: 'Internal error: ' + err?.message }, { status: 500 });
  }
}
