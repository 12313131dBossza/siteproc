/**
 * Xero Accounting Integration
 * Handles OAuth 2.0 authentication and API calls to Xero
 * 
 * SETUP:
 * 1. Go to https://developer.xero.com/app/manage
 * 2. Create a new app
 * 3. Set redirect URI to: https://siteproc1.vercel.app/api/xero/callback
 * 4. Copy Client ID and Client Secret
 * 5. Add to Vercel environment variables
 */

// Environment variables
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || '';
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || '';
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || 'https://siteproc1.vercel.app/api/xero/callback';

// Xero OAuth endpoints
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_API_URL = 'https://api.xero.com/api.xro/2.0';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

// Scopes needed for accounting
const XERO_SCOPES = [
  'openid',
  'profile',
  'email',
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings',
  'offline_access'
].join(' ');

/**
 * Check if Xero is configured
 */
export function isXeroConfigured(): boolean {
  return !!(XERO_CLIENT_ID && XERO_CLIENT_SECRET);
}

/**
 * Generate Xero authorization URL
 */
export function getXeroAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: XERO_SCOPES,
    state: state,
  });

  return `${XERO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeXeroCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
} | null> {
  try {
    const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: XERO_REDIRECT_URI,
      }).toString(),
    });

    if (!response.ok) {
      console.error('[Xero] Token exchange failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Xero] Token exchange error:', error);
    return null;
  }
}

/**
 * Refresh access token
 */
export async function refreshXeroToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.error('[Xero] Token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Xero] Token refresh error:', error);
    return null;
  }
}

/**
 * Get connected Xero tenants (organizations)
 */
export async function getXeroTenants(accessToken: string): Promise<Array<{
  tenantId: string;
  tenantName: string;
  tenantType: string;
}> | null> {
  try {
    const response = await fetch(XERO_CONNECTIONS_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Xero] Failed to get tenants:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Xero] Get tenants error:', error);
    return null;
  }
}

/**
 * Create an expense in Xero
 */
export async function createXeroExpense({
  accessToken,
  tenantId,
  description,
  amount,
  date,
  category,
  reference,
}: {
  accessToken: string;
  tenantId: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  reference?: string;
}): Promise<{ invoiceId: string } | null> {
  try {
    // Create a bill (expense) in Xero
    const invoice = {
      Type: 'ACCPAY', // Accounts Payable (expense/bill)
      Contact: {
        Name: category || 'General Expense',
      },
      Date: date,
      DueDate: date,
      Reference: reference || `SiteProc-${Date.now()}`,
      Status: 'AUTHORISED',
      LineItems: [
        {
          Description: description,
          Quantity: 1,
          UnitAmount: amount,
          AccountCode: '400', // Default expense account
        },
      ],
    };

    const response = await fetch(`${XERO_API_URL}/Invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ Invoices: [invoice] }),
    });

    if (!response.ok) {
      console.error('[Xero] Create expense failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return { invoiceId: data.Invoices?.[0]?.InvoiceID };
  } catch (error) {
    console.error('[Xero] Create expense error:', error);
    return null;
  }
}

/**
 * Create an invoice in Xero
 */
export async function createXeroInvoice({
  accessToken,
  tenantId,
  customerName,
  description,
  amount,
  date,
  dueDate,
  reference,
}: {
  accessToken: string;
  tenantId: string;
  customerName: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  reference?: string;
}): Promise<{ invoiceId: string } | null> {
  try {
    const invoice = {
      Type: 'ACCREC', // Accounts Receivable (invoice)
      Contact: {
        Name: customerName,
      },
      Date: date,
      DueDate: dueDate || date,
      Reference: reference || `SiteProc-${Date.now()}`,
      Status: 'AUTHORISED',
      LineItems: [
        {
          Description: description,
          Quantity: 1,
          UnitAmount: amount,
          AccountCode: '200', // Default sales account
        },
      ],
    };

    const response = await fetch(`${XERO_API_URL}/Invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ Invoices: [invoice] }),
    });

    if (!response.ok) {
      console.error('[Xero] Create invoice failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return { invoiceId: data.Invoices?.[0]?.InvoiceID };
  } catch (error) {
    console.error('[Xero] Create invoice error:', error);
    return null;
  }
}
