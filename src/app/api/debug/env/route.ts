import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Show first 20 chars to verify it's loaded
    serviceRolePreview: process.env.SUPABASE_SERVICE_ROLE?.substring(0, 20) || 'NOT_SET',
  });
}
