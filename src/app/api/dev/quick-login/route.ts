import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

// Quick login for development/testing
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  
  try {
    const supabase = await sbServer()
    
    // Try to sign in with a test email
    const testEmail = 'test@siteproc.dev'
    
    const { error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=/projects`,
        shouldCreateUser: true
      }
    })

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to send login link', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Magic link sent! Check your email for test@siteproc.dev',
      email: testEmail,
      redirectUrl: '/auth/callback?redirectTo=/projects'
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Login failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}