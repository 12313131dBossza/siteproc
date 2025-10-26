/**
 * QuickBooks Configuration Diagnostic Endpoint
 * Shows configuration values (redacted) to help debug OAuth issues
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get user session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Collect diagnostic information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        vercelUrl: process.env.VERCEL_URL,
      },
      quickbooksConfig: {
        clientId: process.env.QUICKBOOKS_CLIENT_ID 
          ? `${process.env.QUICKBOOKS_CLIENT_ID.substring(0, 10)}...` 
          : 'NOT SET',
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET 
          ? 'SET (hidden)' 
          : 'NOT SET',
        redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'NOT SET',
        redirectUriLength: process.env.QUICKBOOKS_REDIRECT_URI?.length || 0,
        redirectUriBytes: process.env.QUICKBOOKS_REDIRECT_URI 
          ? Array.from(process.env.QUICKBOOKS_REDIRECT_URI).map(c => c.charCodeAt(0).toString(16)).join(' ')
          : 'N/A',
        environment: process.env.QUICKBOOKS_ENVIRONMENT || 'NOT SET',
        authEndpoint: process.env.QUICKBOOKS_AUTHORIZATION_ENDPOINT || 'NOT SET',
        tokenEndpoint: process.env.QUICKBOOKS_TOKEN_ENDPOINT || 'NOT SET',
        revokeEndpoint: process.env.QUICKBOOKS_REVOKE_ENDPOINT || 'NOT SET',
        apiBase: process.env.QUICKBOOKS_API_BASE || 'NOT SET',
      },
      databaseConnection: {
        companyId: profile.company_id,
        userRole: profile.role,
      },
      urls: {
        expectedRedirectUri: 'https://siteproc1.vercel.app/api/quickbooks/callback',
        authorizeEndpoint: '/api/quickbooks/authorize',
        callbackEndpoint: '/api/quickbooks/callback',
      },
      checks: {
        allEnvVarsSet: !!(
          process.env.QUICKBOOKS_CLIENT_ID &&
          process.env.QUICKBOOKS_CLIENT_SECRET &&
          process.env.QUICKBOOKS_REDIRECT_URI &&
          process.env.QUICKBOOKS_AUTHORIZATION_ENDPOINT &&
          process.env.QUICKBOOKS_TOKEN_ENDPOINT &&
          process.env.QUICKBOOKS_REVOKE_ENDPOINT &&
          process.env.QUICKBOOKS_API_BASE
        ),
        redirectUriHasWhitespace: /\s/.test(process.env.QUICKBOOKS_REDIRECT_URI || ''),
        redirectUriHasNewline: /[\r\n]/.test(process.env.QUICKBOOKS_REDIRECT_URI || ''),
        redirectUriFormat: /^https?:\/\/.+\/api\/quickbooks\/callback$/.test(process.env.QUICKBOOKS_REDIRECT_URI || ''),
      }
    };

    // Check for existing QuickBooks connection
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('company_id', profile.company_id)
      .single();

    if (connection) {
      diagnostics.databaseConnection = {
        ...diagnostics.databaseConnection,
        connectionExists: true,
        isActive: connection.is_active,
        realmId: connection.realm_id,
        tokenExpiresAt: connection.token_expires_at,
        lastSyncAt: connection.last_sync_at,
      };
    } else {
      diagnostics.databaseConnection = {
        ...diagnostics.databaseConnection,
        connectionExists: false,
      };
    }

    return NextResponse.json(diagnostics, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
