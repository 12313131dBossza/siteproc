import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/debug/env-check
 * Shows which environment variables are set in Vercel
 * (Safe to expose - only for debugging)
 */
export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleSet: !!process.env.SUPABASE_SERVICE_ROLE,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV,
    // Redact keys but show first/last chars for verification
    anonKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 10)}...${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-10)}`
      : 'NOT SET',
    serviceRolePreview: process.env.SUPABASE_SERVICE_ROLE
      ? `${process.env.SUPABASE_SERVICE_ROLE.slice(0, 10)}...${process.env.SUPABASE_SERVICE_ROLE.slice(-10)}`
      : 'NOT SET'
  }, { status: 200 })
}
