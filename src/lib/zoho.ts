/**
 * Zoho Books Integration
 * Handles OAuth 2.0 authentication and API calls to Zoho Books
 * 
 * FREE TIER: Available for businesses with less than $50k annual revenue
 * 
 * SETUP:
 * 1. Go to https://api-console.zoho.com/
 * 2. Click "Add Client" → "Server-based Applications"
 * 3. Set redirect URI to: https://siteproc1.vercel.app/api/zoho/callback
 * 4. Copy Client ID and Client Secret
 * 5. Add to Vercel environment variables
 */

// Environment variables
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI || 'https://siteproc1.vercel.app/api/zoho/callback';

// Zoho data centers - default to US
const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
const ZOHO_BOOKS_API = process.env.ZOHO_BOOKS_API || 'https://www.zohoapis.com/books/v3';

// OAuth endpoints
const ZOHO_AUTH_URL = `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth`;
const ZOHO_TOKEN_URL = `${ZOHO_ACCOUNTS_URL}/oauth/v2/token`;

// Scopes needed
const ZOHO_SCOPES = [
  'ZohoBooks.fullaccess.all'
].join(',');

/**
 * Check if Zoho is configured
 */
export function isZohoConfigured(): boolean {
  return !!(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET);
}

/**
 * Generate Zoho authorization URL
 */
export function getZohoAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOHO_CLIENT_ID,
    redirect_uri: ZOHO_REDIRECT_URI,
    scope: ZOHO_SCOPES,
    state: state,
    access_type: 'offline', // Get refresh token
    prompt: 'consent',
  });

  return `${ZOHO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeZohoCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  api_domain: string;
} | null> {
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      redirect_uri: ZOHO_REDIRECT_URI,
      code,
    });

    const response = await fetch(`${ZOHO_TOKEN_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('[Zoho] Token exchange failed:', await response.text());
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('[Zoho] Token error:', data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Zoho] Token exchange error:', error);
    return null;
  }
}

/**
 * Refresh access token
 */
export async function refreshZohoToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const response = await fetch(`${ZOHO_TOKEN_URL}?${params.toString()}`, {
      method: 'POST',
    });

    if (!response.ok) {
      console.error('[Zoho] Token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Zoho] Token refresh error:', error);
    return null;
  }
}

/**
 * Get Zoho Books organizations
 */
export async function getZohoOrganizations(accessToken: string): Promise<Array<{
  organization_id: string;
  name: string;
  is_default_org: boolean;
}> | null> {
  try {
    const response = await fetch(`${ZOHO_BOOKS_API}/organizations`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Zoho] Failed to get organizations:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.organizations || [];
  } catch (error) {
    console.error('[Zoho] Get organizations error:', error);
    return null;
  }
}

/**
 * Search for a vendor/contact in Zoho Books
 */
export async function searchZohoVendor(
  accessToken: string, 
  organizationId: string, 
  vendorName: string
): Promise<{ contact_id: string; contact_name: string } | null> {
  try {
    const searchName = encodeURIComponent(vendorName);
    const response = await fetch(
      `${ZOHO_BOOKS_API}/contacts?organization_id=${organizationId}&contact_type=vendor&search_text=${searchName}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[Zoho] Failed to search vendors:', await response.text());
      return null;
    }

    const data = await response.json();
    const contacts = data.contacts || [];
    
    // Find exact or close match
    const exactMatch = contacts.find((c: any) => 
      c.contact_name.toLowerCase() === vendorName.toLowerCase()
    );
    
    if (exactMatch) {
      return { contact_id: exactMatch.contact_id, contact_name: exactMatch.contact_name };
    }
    
    // Only return existing vendor if it's an EXACT match
    // Don't use partial matches - create a new vendor instead
    // This prevents using wrong vendors like "DFF" when searching for "sdd"
    
    return null;
  } catch (error) {
    console.error('[Zoho] Search vendor error:', error);
    return null;
  }
}

/**
 * Create a vendor/contact in Zoho Books
 */
export async function createZohoVendor(
  accessToken: string, 
  organizationId: string, 
  vendorName: string
): Promise<{ contact_id: string; contact_name: string } | null> {
  try {
    const vendor = {
      contact_name: vendorName,
      contact_type: 'vendor',
    };

    const response = await fetch(`${ZOHO_BOOKS_API}/contacts?organization_id=${organizationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vendor),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zoho] Failed to create vendor:', errorText);
      return null;
    }

    const data = await response.json();
    if (data.contact) {
      return { contact_id: data.contact.contact_id, contact_name: data.contact.contact_name };
    }
    return null;
  } catch (error) {
    console.error('[Zoho] Create vendor error:', error);
    return null;
  }
}

/**
 * Get or create a vendor in Zoho Books
 */
export async function getOrCreateZohoVendor(
  accessToken: string, 
  organizationId: string, 
  vendorName: string
): Promise<{ contact_id: string; contact_name: string } | null> {
  // First, search for existing vendor
  const existing = await searchZohoVendor(accessToken, organizationId, vendorName);
  if (existing) {
    console.log(`[Zoho] Found existing vendor: ${existing.contact_name} (${existing.contact_id})`);
    return existing;
  }
  
  // Create new vendor
  console.log(`[Zoho] Creating new vendor: ${vendorName}`);
  return await createZohoVendor(accessToken, organizationId, vendorName);
}

/**
 * Get expense accounts from Zoho Books
 */
export async function getZohoExpenseAccounts(accessToken: string, organizationId: string): Promise<Array<{
  account_id: string;
  account_name: string;
  account_type: string;
}> | null> {
  try {
    const response = await fetch(`${ZOHO_BOOKS_API}/chartofaccounts?organization_id=${organizationId}&account_type=expense`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Zoho] Failed to get expense accounts:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.chartofaccounts || [];
  } catch (error) {
    console.error('[Zoho] Get expense accounts error:', error);
    return null;
  }
}

/**
 * Get cash/bank accounts from Zoho Books for "Paid Through"
 */
export async function getZohoCashAccounts(accessToken: string, organizationId: string): Promise<Array<{
  account_id: string;
  account_name: string;
  account_type: string;
}> | null> {
  try {
    // Get cash and bank accounts
    const response = await fetch(`${ZOHO_BOOKS_API}/chartofaccounts?organization_id=${organizationId}`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Zoho] Failed to get cash accounts:', await response.text());
      return null;
    }

    const data = await response.json();
    const accounts = data.chartofaccounts || [];
    
    // Filter for cash and bank accounts, EXCLUDING "Undeposited Funds"
    const cashAccounts = accounts.filter((a: any) => {
      const type = (a.account_type || '').toLowerCase();
      const name = (a.account_name || '').toLowerCase();
      
      // Exclude "Undeposited Funds" - we want actual cash/bank accounts
      if (name.includes('undeposited')) {
        return false;
      }
      
      return type === 'cash' || 
             type === 'bank' ||
             name.includes('petty cash') ||
             name.includes('cash on hand');
    });

    // Sort by account type: bank accounts first, then cash accounts
    // This way bank_transfer won't accidentally fall back to Petty Cash
    cashAccounts.sort((a: any, b: any) => {
      const aType = (a.account_type || '').toLowerCase();
      const bType = (b.account_type || '').toLowerCase();
      // Bank accounts first
      if (aType === 'bank' && bType !== 'bank') return -1;
      if (bType === 'bank' && aType !== 'bank') return 1;
      return 0;
    });

    return cashAccounts;
  } catch (error) {
    console.error('[Zoho] Get cash accounts error:', error);
    return null;
  }
}

/**
 * Create an expense in Zoho Books
 */
export async function createZohoExpense({
  accessToken,
  organizationId,
  description,
  amount,
  date,
  category,
  reference,
  vendor,
  paymentMethod,
}: {
  accessToken: string;
  organizationId: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  reference?: string;
  vendor?: string;
  paymentMethod?: string;
}): Promise<{ expenseId: string } | null> {
  try {
    // Get expense accounts to find a valid account_id
    const accounts = await getZohoExpenseAccounts(accessToken, organizationId);
    
    // Find an appropriate expense account based on category, or use the first available
    let accountId = '';
    if (accounts && accounts.length > 0) {
      // Try to match category to account name, or use first expense account
      const matchedAccount = category 
        ? accounts.find(a => a.account_name.toLowerCase().includes(category.toLowerCase()))
        : null;
      accountId = matchedAccount?.account_id || accounts[0].account_id;
    }

    if (!accountId) {
      console.error('[Zoho] No expense account found');
      return null;
    }

    // Get a cash/bank account for "Paid Through" based on user's payment method selection
    const cashAccounts = await getZohoCashAccounts(accessToken, organizationId);
    let paidThroughAccountId: string | null = null;
    
    console.log(`[Zoho] Payment method received: "${paymentMethod}"`);
    console.log(`[Zoho] Available cash/bank accounts:`, cashAccounts?.map(a => a.account_name));
    
    if (cashAccounts && cashAccounts.length > 0) {
      // Map payment method to likely Zoho account name
      const methodToAccountMap: { [key: string]: string[] } = {
        'petty_cash': ['petty cash', 'petty'],
        'cash': ['cash', 'petty cash'],
        'bank_transfer': ['bank', 'checking', 'savings', 'transfer', 'current'],
        'wise': ['wise', 'bank', 'transfer'],
        'ach': ['ach', 'bank', 'checking'],
        'credit_card': ['credit card', 'credit', 'card'],
        'check': ['checking', 'bank', 'cheque', 'current'],
        'transfer': ['bank', 'transfer', 'checking', 'current'],
        'card': ['credit card', 'card', 'credit'],
        'other': [], // Will use first available
      };
      
      const searchTerms = paymentMethod ? methodToAccountMap[paymentMethod] || [] : [];
      console.log(`[Zoho] Search terms for "${paymentMethod}":`, searchTerms);
      
      // Try to find matching account
      if (searchTerms.length > 0) {
        for (const term of searchTerms) {
          const matchedAccount = cashAccounts.find(a => 
            a.account_name.toLowerCase().includes(term)
          );
          if (matchedAccount) {
            paidThroughAccountId = matchedAccount.account_id;
            console.log(`[Zoho] ✓ MATCHED: Using "${matchedAccount.account_name}" for payment method "${paymentMethod}"`);
            break;
          }
        }
      }
      
      // Fallback to first available if no match or no payment method specified
      if (!paidThroughAccountId) {
        // If bank_transfer was requested but no bank found, prefer any non-petty-cash account
        if (paymentMethod === 'bank_transfer' || paymentMethod === 'check' || paymentMethod === 'wise') {
          const nonPettyCash = cashAccounts.find(a => !a.account_name.toLowerCase().includes('petty'));
          if (nonPettyCash) {
            paidThroughAccountId = nonPettyCash.account_id;
            console.log(`[Zoho] Using non-petty-cash account "${nonPettyCash.account_name}" for "${paymentMethod}"`);
          } else {
            paidThroughAccountId = cashAccounts[0].account_id;
            console.log(`[Zoho] No matching account for "${paymentMethod}", falling back to "${cashAccounts[0].account_name}"`);
          }
        } else {
          paidThroughAccountId = cashAccounts[0].account_id;
          console.log(`[Zoho] No matching account for "${paymentMethod}", using "${cashAccounts[0].account_name}"`);
        }
      }
    }

    const expense: any = {
      account_id: accountId,
      date: date,
      amount: amount,
      description: description,
      reference_number: reference || `SP-${Date.now()}`,
    };

    // Add paid_through_account_id if we found a cash/bank account
    if (paidThroughAccountId) {
      expense.paid_through_account_id = paidThroughAccountId;
    }

    // Get or create vendor in Zoho and link by vendor_id
    if (vendor) {
      const zohoVendor = await getOrCreateZohoVendor(accessToken, organizationId, vendor);
      if (zohoVendor) {
        expense.vendor_id = zohoVendor.contact_id;
        console.log(`[Zoho] Linking expense to vendor: ${zohoVendor.contact_name} (${zohoVendor.contact_id})`);
      } else {
        console.warn(`[Zoho] Could not create/find vendor: ${vendor}`);
      }
    }

    const response = await fetch(`${ZOHO_BOOKS_API}/expenses?organization_id=${organizationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expense),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zoho] Create expense failed:', errorText);
      return null;
    }

    const data = await response.json();
    return { expenseId: data.expense?.expense_id };
  } catch (error) {
    console.error('[Zoho] Create expense error:', error);
    return null;
  }
}

/**
 * Create an invoice in Zoho Books
 */
export async function createZohoInvoice({
  accessToken,
  organizationId,
  customerName,
  description,
  amount,
  date,
  dueDate,
  reference,
}: {
  accessToken: string;
  organizationId: string;
  customerName: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  reference?: string;
}): Promise<{ invoiceId: string } | null> {
  try {
    // First, get or create customer
    const invoice = {
      customer_name: customerName,
      date: date,
      due_date: dueDate || date,
      reference_number: reference || `SP-${Date.now()}`,
      line_items: [
        {
          description: description,
          rate: amount,
          quantity: 1,
        },
      ],
    };

    const response = await fetch(`${ZOHO_BOOKS_API}/invoices?organization_id=${organizationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      console.error('[Zoho] Create invoice failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return { invoiceId: data.invoice?.invoice_id };
  } catch (error) {
    console.error('[Zoho] Create invoice error:', error);
    return null;
  }
}
