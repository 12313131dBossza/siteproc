import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  
  const email = process.env.DEV_AUTOLOGIN_EMAIL || process.env.DEV_LOGIN_EMAIL || 'dev@example.com'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
  
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
  }

  try {
    // Use service role to generate magic link
    const supabaseAdmin = createServerClient(url, serviceKey, {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    })

    console.log('[dev/autologin] Generating magic link for:', email)
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${appUrl}/auth/callback`
      }
    })

    if (error) {
      console.error('[dev/autologin] Generate link error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.properties?.action_link) {
      return NextResponse.json({ error: 'No action link generated' }, { status: 400 })
    }

    console.log('[dev/autologin] Redirecting to magic link')
    // Redirect to the magic link which will complete auth and redirect to callback
    return NextResponse.redirect(data.properties.action_link)

  } catch (e: any) {
    console.error('[dev/autologin] Exception:', e?.message)
    return NextResponse.json({ error: e?.message || 'Autologin failed' }, { status: 500 })
  }
}

// Keep POST for backward compatibility
export async function POST() {
  return GET()
}
