import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key (first 20 chars):', supabaseKey?.substring(0, 20));
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    
    return NextResponse.json({
      success: true,
      supabaseConnected: true,
      sessionError: error?.message || null,
      hasSession: !!data.session
    });
    
  } catch (error: any) {
    console.error('Supabase test error:', error);
    return NextResponse.json({
      error: error.message,
      type: error.constructor.name,
      stack: error.stack
    }, { status: 500 });
  }
}
