import { sbServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabase = await sbServer();
    
    // Use the dev email from environment
    const testEmail = process.env.DEV_AUTOLOGIN_EMAIL || 'bossbcz@gmail.com';
    
    console.log('Sending magic link to:', testEmail);
    
    // Send magic link to dev email
    const { error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?redirectTo=/dashboard`
      }
    });

    if (error) {
      console.error('Magic link error:', error);
      return NextResponse.json({ error: 'Failed to send magic link: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Magic link sent to ${testEmail}. Check your email!`,
      email: testEmail
    });

  } catch (error) {
    console.error('Autologin error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
