import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: any) {
  const response = NextResponse.next();
  const url = new URL(req.url);
  const path = url.pathname;

  // Skip middleware for public paths
  const PUBLIC_PATHS = ['/login', '/auth/callback'];
  const isPublicPath = PUBLIC_PATHS.includes(path) || 
                       path.startsWith('/api') || 
                       path.startsWith('/_next') || 
                       path === '/favicon.ico';

  if (isPublicPath) {
    return response;
  }

  // Simple auth check for protected routes
  try {
    const supabase = createMiddlewareClient({ req, res: response });
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    // Redirect to login if accessing dashboard without auth
    if (path.startsWith('/dashboard') && !session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Redirect to dashboard if accessing login while authenticated
    if (path === '/login' && session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  } catch (err) {
    console.log('[middleware] Auth check failed:', err);
  }

  return response;
}

export const config = { 
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
