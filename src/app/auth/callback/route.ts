// DISABLED - This file conflicts with page.tsx
// Next.js App Router cannot have both route.ts and page.tsx in same directory
// DELETE THIS FILE before deployment

export async function GET() {
  return new Response('Route disabled - using page.tsx', { status: 410 });
}
  const code = url.searchParams.get('code') ?? url.searchParams.get('access_token');
  
  console.log('[auth/callback] Processing callback, code present:', !!code);
  
  if (!code) {
    console.log('[auth/callback] No code, redirecting to login');
    return NextResponse.redirect(new URL('/login?e=nocode', url.origin));
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[auth/callback] Exchanging code for session');
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] Exchange error:', error.message);
      return NextResponse.redirect(new URL('/login?e=callback', url.origin));
    }

    const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
    console.log('[auth/callback] Success, redirecting to:', redirectTo);
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  } catch (err: any) {
    console.error('[auth/callback] Exception:', err?.message);
    return NextResponse.redirect(new URL('/login?e=callback', url.origin));
  }
}
