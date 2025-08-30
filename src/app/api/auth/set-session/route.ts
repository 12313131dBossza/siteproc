import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json();
    
    console.log('[set-session] Setting session from tokens');
    
    if (!access_token || !refresh_token) {
      console.error('[set-session] Missing tokens');
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const cookieStore = await cookies();

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
                cookieStore.set(name, value, options)
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
    
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('[set-session] Set session error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[set-session] Session set successfully');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[set-session] Exception:', err?.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
