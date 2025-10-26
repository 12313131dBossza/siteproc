/**
 * QuickBooks OAuth - Callback Endpoint
 * Handles the OAuth callback from QuickBooks and exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/quickbooks';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Detailed logging for diagnostics: log full incoming URL, params and selected headers
    try {
      const paramObj: Record<string, string | null> = {};
      searchParams.forEach((v, k) => (paramObj[k] = v));

      const headerSnapshot: Record<string, string | null> = {
        'user-agent': request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        host: request.headers.get('host'),
      };

      console.error('[QB CALLBACK] incoming URL:', request.url);
      console.error('[QB CALLBACK] params:', JSON.stringify(paramObj));
      console.error('[QB CALLBACK] headers:', JSON.stringify(headerSnapshot));
    } catch (logErr) {
      console.error('Failed to log callback details:', logErr);
    }

    // Check for OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error, 'description:', errorDescription);
      // Include description in redirect for easier troubleshooting (URL-encoded)
      const redirectUrl = new URL('/admin/quickbooks', request.url);
      redirectUrl.searchParams.set('error', error);
      if (errorDescription) redirectUrl.searchParams.set('error_description', errorDescription);
      return NextResponse.redirect(redirectUrl);
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        new URL('/admin/quickbooks?error=invalid_callback', request.url)
      );
    }

    // Decode and validate state
    let stateData;
    try {
      const decodedState = Buffer.from(state, 'base64').toString('utf-8');
      stateData = JSON.parse(decodedState);

      // Verify state timestamp (should be within 10 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        throw new Error('State expired');
      }
    } catch (err) {
      console.error('Invalid state:', err);
      return NextResponse.redirect(
        new URL('/admin/quickbooks?error=invalid_state', request.url)
      );
    }

    const { companyId, userId } = stateData;

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Calculate token expiration times
    const now = new Date();
    const accessTokenExpiry = new Date(now.getTime() + tokens.expiresIn * 1000);
    const refreshTokenExpiry = new Date(now.getTime() + tokens.refreshTokenExpiresIn * 1000);

    // Store tokens in database
    const supabase = await createClient();

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('quickbooks_connections')
      .select('id')
      .eq('company_id', companyId)
      .single();

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('quickbooks_connections')
        .update({
          realm_id: realmId,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: accessTokenExpiry.toISOString(),
          refresh_token_expires_at: refreshTokenExpiry.toISOString(),
          is_active: true,
          updated_at: now.toISOString(),
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        return NextResponse.redirect(
          new URL('/admin/quickbooks?error=database_error', request.url)
        );
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('quickbooks_connections')
        .insert({
          company_id: companyId,
          realm_id: realmId,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: accessTokenExpiry.toISOString(),
          refresh_token_expires_at: refreshTokenExpiry.toISOString(),
          is_active: true,
        });

      if (insertError) {
        console.error('Failed to store connection:', insertError);
        return NextResponse.redirect(
          new URL('/admin/quickbooks?error=database_error', request.url)
        );
      }
    }

    // Success! Redirect to QuickBooks settings page
    return NextResponse.redirect(
      new URL('/admin/quickbooks?success=connected', request.url)
    );

  } catch (error) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.redirect(
      new URL('/admin/quickbooks?error=unknown', request.url)
    );
  }
}
