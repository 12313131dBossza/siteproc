import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/auth/test-login
 * 
 * Temporary endpoint to test if OTP login works.
 * Send: { email: 'test@example.com' }
 * 
 * This will help diagnose auth issues by testing the flow directly.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Test Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: 'Missing Supabase configuration',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey
          }
        },
        { status: 500 }
      )
    }

    // Try to reach Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      timeout: 5000
    } as any)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Supabase is not responding',
          status: response.status,
          statusText: response.statusText
        },
        { status: 502 }
      )
    }

    const settings = await response.json()

    return NextResponse.json({
      ok: true,
      message: 'Supabase connection is working',
      supabaseUrl,
      emailAuthEnabled: settings.external?.email === true,
      settings
    })
  } catch (err: any) {
    console.error('Auth test error:', err)
    return NextResponse.json(
      {
        error: err.message || 'Connection test failed',
        type: err.code || 'unknown'
      },
      { status: 500 }
    )
  }
}
