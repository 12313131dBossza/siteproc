import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Test sending magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://siteproc1.vercel.app/auth/callback',
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[test-auth] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent',
      config: {
        redirectTo: 'https://siteproc1.vercel.app/auth/callback',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    });
  } catch (err: any) {
    console.error('[test-auth] Exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
