import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    
    console.log('[exchange-code] Exchanging PKCE code for session');
    
    if (!code) {
      console.error('[exchange-code] Missing code');
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
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
