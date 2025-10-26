/**
 * QuickBooks OAuth - Authorization Debug Endpoint
 * Returns the computed authorization URL and parameters without redirecting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthorizationUrl } from '@/lib/quickbooks';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Minimal state for testing
    const stateData = {
      companyId: profile.company_id,
      userId: user.id,
      ts: Date.now(),
      r: Math.random().toString(36).slice(2, 10),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    const url = getAuthorizationUrl(state);

    // Also expose selected env used to build URL (redacted where needed)
    const env = {
      clientId: (process.env.QUICKBOOKS_CLIENT_ID || '').slice(0, 10) + '...',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
      environment: process.env.QUICKBOOKS_ENVIRONMENT,
      authEndpoint: process.env.QUICKBOOKS_AUTHORIZATION_ENDPOINT,
    };

    const parsed = new URL(url);
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => (params[k] = v));

    return NextResponse.json({
      ok: true,
      url,
      params,
      env,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
