import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing environment variables'
      }, { status: 500 });
    }
    
    console.log('Testing auth with email:', email);
    console.log('Supabase URL:', supabaseUrl);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test the auth call with a shorter timeout
    const authPromise = supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://siteproc1.vercel.app/auth/callback',
        shouldCreateUser: true,
      },
    });
    
    // Add a timeout to avoid hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000);
    });
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;
    
    return NextResponse.json({
      success: !error,
      error: error ? {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error
      } : null,
      data: data || null
    });
    
  } catch (error: any) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      error: {
        message: error.message,
        type: error.constructor?.name,
        stack: error.stack
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with {"email": "your@email.com"} to test auth'
  });
}
