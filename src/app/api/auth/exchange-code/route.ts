import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    console.log('[exchange-code] Starting code exchange');
    console.log('[exchange-code] Environment check:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    });
    
    const { code } = await req.json();
    
    console.log('[exchange-code] Exchanging PKCE code for session');
    
    if (!code) {
      console.error('[exchange-code] Missing code');
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    console.log('[exchange-code] Supabase client created');
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[exchange-code] Exchange error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[exchange-code] Code exchange successful');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[exchange-code] Exception:', err?.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
