/**
 * QuickBooks OAuth and API Integration
 * Handles authentication, token management, and API calls to QuickBooks Online
 */

import { createClient } from '@/lib/supabase/server';

// Environment variables
const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID!;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET!;
const QB_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI!;
const QB_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
const QB_AUTH_ENDPOINT = process.env.QUICKBOOKS_AUTHORIZATION_ENDPOINT!;
const QB_TOKEN_ENDPOINT = process.env.QUICKBOOKS_TOKEN_ENDPOINT!;
const QB_REVOKE_ENDPOINT = process.env.QUICKBOOKS_REVOKE_ENDPOINT!;
const QB_API_BASE = process.env.QUICKBOOKS_API_BASE!;

// OAuth Scopes
const QB_SCOPES = [
  'com.intuit.quickbooks.accounting',
  'openid',
  'profile',
  'email',
].join(' ');

/**
 * Generate authorization URL for OAuth flow
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    scope: QB_SCOPES,
    redirect_uri: QB_REDIRECT_URI,
    response_type: 'code',
    state,
  });

  return `${QB_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const authHeader = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(QB_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: QB_REDIRECT_URI,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in, // seconds (usually 3600 = 1 hour)
    refreshTokenExpiresIn: data.x_refresh_token_expires_in, // seconds (usually 8640000 = 100 days)
    realmId: data.realmId,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const authHeader = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(QB_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshTokenExpiresIn: data.x_refresh_token_expires_in,
  };
}

/**
 * Revoke access to QuickBooks (disconnect)
 */
export async function revokeToken(refreshToken: string) {
  const authHeader = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(QB_REVOKE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`,
    },
    body: new URLSearchParams({
      token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token revocation failed: ${error}`);
  }

  return true;
}

/**
 * Get valid access token for a company (refresh if needed)
 */
export async function getValidAccessToken(companyId: string): Promise<string | null> {
  const supabase = await createClient();

  // Get connection from database
  const { data: connection, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (error || !connection) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (now.getTime() < expiresAt.getTime() - bufferTime) {
    // Token is still valid
    return connection.access_token;
  }

  // Token expired, need to refresh
  try {
    const newTokens = await refreshAccessToken(connection.refresh_token);

    // Calculate new expiration times
    const newAccessTokenExpiry = new Date(now.getTime() + newTokens.expiresIn * 1000);
    const newRefreshTokenExpiry = new Date(now.getTime() + newTokens.refreshTokenExpiresIn * 1000);

    // Update tokens in database
    const { error: updateError } = await supabase
      .from('quickbooks_connections')
      .update({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
        token_expires_at: newAccessTokenExpiry.toISOString(),
        refresh_token_expires_at: newRefreshTokenExpiry.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return null;
    }

    return newTokens.accessToken;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    // Mark connection as inactive if refresh fails
    await supabase
      .from('quickbooks_connections')
      .update({ is_active: false })
      .eq('id', connection.id);
    return null;
  }
}

/**
 * Make authenticated API call to QuickBooks
 */
export async function makeQBApiCall<T = any>(
  companyId: string,
  realmId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(companyId);

  if (!accessToken) {
    throw new Error('No valid QuickBooks access token available');
  }

  const url = `${QB_API_BASE}/v3/company/${realmId}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks API call failed: ${error}`);
  }

  return response.json();
}

/**
 * Get company info from QuickBooks
 */
export async function getCompanyInfo(companyId: string, realmId: string) {
  return makeQBApiCall(companyId, realmId, '/companyinfo/' + realmId);
}

/**
 * Create a customer in QuickBooks
 */
export async function createCustomer(
  companyId: string,
  realmId: string,
  customerData: {
    displayName: string;
    email?: string;
    phone?: string;
    billingAddress?: {
      line1?: string;
      city?: string;
      countrySubDivisionCode?: string;
      postalCode?: string;
    };
  }
) {
  const payload = {
    DisplayName: customerData.displayName,
    ...(customerData.email && {
      PrimaryEmailAddr: { Address: customerData.email },
    }),
    ...(customerData.phone && {
      PrimaryPhone: { FreeFormNumber: customerData.phone },
    }),
    ...(customerData.billingAddress && {
      BillAddr: customerData.billingAddress,
    }),
  };

  return makeQBApiCall(companyId, realmId, '/customer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Create an invoice in QuickBooks
 */
export async function createInvoice(
  companyId: string,
  realmId: string,
  invoiceData: {
    customerRef: string; // QB Customer ID
    lineItems: Array<{
      amount: number;
      description: string;
      itemRef?: string; // Optional QB Item ID
    }>;
    txnDate?: string; // YYYY-MM-DD format
    dueDate?: string;
  }
) {
  const payload = {
    CustomerRef: { value: invoiceData.customerRef },
    Line: invoiceData.lineItems.map((item) => ({
      Amount: item.amount,
      DetailType: 'SalesItemLineDetail',
      Description: item.description,
      SalesItemLineDetail: {
        ...(item.itemRef && { ItemRef: { value: item.itemRef } }),
      },
    })),
    ...(invoiceData.txnDate && { TxnDate: invoiceData.txnDate }),
    ...(invoiceData.dueDate && { DueDate: invoiceData.dueDate }),
  };

  return makeQBApiCall(companyId, realmId, '/invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Create a payment in QuickBooks
 */
export async function createPayment(
  companyId: string,
  realmId: string,
  paymentData: {
    customerRef: string;
    totalAmount: number;
    txnDate?: string;
    paymentMethodRef?: string;
  }
) {
  const payload = {
    CustomerRef: { value: paymentData.customerRef },
    TotalAmt: paymentData.totalAmount,
    ...(paymentData.txnDate && { TxnDate: paymentData.txnDate }),
    ...(paymentData.paymentMethodRef && {
      PaymentMethodRef: { value: paymentData.paymentMethodRef },
    }),
  };

  return makeQBApiCall(companyId, realmId, '/payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Query QuickBooks entities (generic query)
 */
export async function queryQB<T = any>(
  companyId: string,
  realmId: string,
  query: string
): Promise<T> {
  const encodedQuery = encodeURIComponent(query);
  return makeQBApiCall(companyId, realmId, `/query?query=${encodedQuery}`);
}

/**
 * Get all customers from QuickBooks
 */
export async function getCustomers(companyId: string, realmId: string) {
  return queryQB(companyId, realmId, "SELECT * FROM Customer MAXRESULTS 1000");
}

/**
 * Get all invoices from QuickBooks
 */
export async function getInvoices(companyId: string, realmId: string) {
  return queryQB(companyId, realmId, "SELECT * FROM Invoice MAXRESULTS 1000");
}

/**
 * Get connection status for a company
 */
export async function getConnectionStatus(companyId: string) {
  const supabase = await createClient();

  const { data: connection, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (error || !connection) {
    return {
      connected: false,
      realmId: null,
      lastSync: null,
    };
  }

  return {
    connected: true,
    realmId: connection.realm_id,
    lastSync: connection.last_sync_at,
    tokenExpiresAt: connection.token_expires_at,
  };
}

/**
 * Log sync operation
 */
export async function logSync(
  connectionId: string,
  syncType: 'customers' | 'invoices' | 'payments' | 'full',
  status: 'success' | 'failed' | 'partial',
  recordsSynced: number,
  recordsFailed: number = 0,
  errorMessage?: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('quickbooks_sync_log')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      status,
      records_synced: recordsSynced,
      records_failed: recordsFailed,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to log sync:', error);
  }
}
