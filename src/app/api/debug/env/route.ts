import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      APP_BASE_URL: process.env.APP_BASE_URL || 'MISSING',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      timestamp: new Date().toISOString(),
    };

    // Try to create Supabase client
    let supabaseStatus = 'UNKNOWN';
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        supabaseStatus = `ERROR: ${error.message}`;
      } else {
        supabaseStatus = 'CLIENT_CREATED_SUCCESSFULLY';
      }
    } catch (err: any) {
      supabaseStatus = `EXCEPTION: ${err.message}`;
    }

    return NextResponse.json({
      environment: envVars,
      supabase: supabaseStatus,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: `Debug route failed: ${err.message}`,
    }, { status: 500 });
  }
}
