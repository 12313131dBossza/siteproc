/**
 * Zoho Books Auto-Sync Utilities
 * Automatically sync expenses and invoices to Zoho Books when created/updated
 */

import { createZohoExpense, createZohoInvoice, updateZohoExpense, deleteZohoExpense, refreshZohoToken } from './zoho';
import { createServiceClient } from './supabase-service';

interface AutoSyncResult {
  success: boolean;
  synced: boolean;
  zohoId?: string;
  error?: string;
}

interface ZohoIntegration {
  id: string;
  company_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  tenant_id: string; // organization_id
  tenant_name: string;
  status: string;
  settings?: {
    auto_sync_expenses?: boolean;
    auto_sync_invoices?: boolean;
  };
}

/**
 * Get Zoho integration for a company
 */
async function getZohoIntegration(companyId: string): Promise<ZohoIntegration | null> {
  try {
    const supabase = createServiceClient();
    
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('provider', 'zoho')
      .eq('status', 'connected')
      .single();

    if (error || !integration) {
      return null;
    }

    return integration as ZohoIntegration;
  } catch (error) {
    console.error('[Zoho AutoSync] Error getting integration:', error);
    return null;
  }
}

/**
 * Get valid access token, refreshing if needed
 */
async function getValidAccessToken(integration: ZohoIntegration): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const expiresAt = new Date(integration.token_expires_at);
    
    // If token is still valid (with 5 min buffer), use it
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return integration.access_token;
    }

    // Token expired or expiring soon, refresh it
    console.log('[Zoho AutoSync] Refreshing expired token...');
    const refreshed = await refreshZohoToken(integration.refresh_token);
    
    if (!refreshed) {
      console.error('[Zoho AutoSync] Failed to refresh token');
      return null;
    }

    // Update token in database
    await supabase
      .from('integrations')
      .update({
        access_token: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('id', integration.id);

    return refreshed.access_token;
  } catch (error) {
    console.error('[Zoho AutoSync] Error refreshing token:', error);
    return null;
  }
}

/**
 * Check if Zoho auto-sync is enabled for expenses
 */
export async function isZohoAutoSyncEnabled(companyId: string): Promise<boolean> {
  const integration = await getZohoIntegration(companyId);
  if (!integration) return false;
  
  // Default to true if connected and not explicitly disabled
  return integration.settings?.auto_sync_expenses !== false;
}

/**
 * Auto-sync a single expense to Zoho Books
 * Call this after creating or approving an expense
 */
export async function autoSyncExpenseToZoho(
  companyId: string,
  expenseId: string,
  status: string
): Promise<AutoSyncResult> {
  // Only sync approved expenses
  if (status !== 'approved') {
    return { success: true, synced: false, error: 'Only approved expenses are synced to Zoho' };
  }

  try {
    // Get Zoho integration
    const integration = await getZohoIntegration(companyId);
    if (!integration) {
      return { success: true, synced: false, error: 'Zoho not connected' };
    }

    // Check if auto-sync is enabled
    if (integration.settings?.auto_sync_expenses === false) {
      return { success: true, synced: false, error: 'Zoho auto-sync disabled' };
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);
    if (!accessToken) {
      return { success: false, synced: false, error: 'Failed to get valid Zoho access token' };
    }

    // Get expense details
    const supabase = createServiceClient();
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        projects(name)
      `)
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return { success: false, synced: false, error: 'Expense not found' };
    }

    // Check if already synced to Zoho
    if (expense.zoho_expense_id) {
      return { success: true, synced: false, error: 'Already synced to Zoho' };
    }

    // Create expense in Zoho Books
    // Use vendor from expense, or fallback to clear identifier for review
    const vendorName = expense.vendor?.trim() || 'UNKNOWN VENDOR – REVIEW NEEDED';
    
    const result = await createZohoExpense({
      accessToken,
      organizationId: integration.tenant_id,
      description: expense.description || expense.memo || 'Expense from SiteProc',
      amount: expense.amount,
      date: expense.spent_at || expense.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      category: expense.category,
      reference: `SP-EXP-${expense.id.slice(0, 8)}`,
      vendor: vendorName,
      paymentMethod: expense.payment_method, // User-selected payment method
    });

    if (!result) {
      console.error('[Zoho AutoSync] Failed to create expense in Zoho');
      return { success: false, synced: false, error: 'Failed to create expense in Zoho Books' };
    }

    // Update expense with Zoho ID
    await supabase
      .from('expenses')
      .update({ zoho_expense_id: result.expenseId })
      .eq('id', expenseId);

    console.log(`[Zoho AutoSync] Expense ${expenseId} synced to Zoho expense ${result.expenseId}`);
    return { success: true, synced: true, zohoId: result.expenseId };

  } catch (error) {
    console.error('[Zoho AutoSync] Error syncing expense:', error);
    return { success: false, synced: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync expense UPDATE to Zoho Books
 * Call this after updating an expense that's already synced
 */
export async function syncExpenseUpdateToZoho(
  companyId: string,
  expenseId: string
): Promise<AutoSyncResult> {
  try {
    // Get Zoho integration
    const integration = await getZohoIntegration(companyId);
    if (!integration) {
      return { success: true, synced: false, error: 'Zoho not connected' };
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);
    if (!accessToken) {
      return { success: false, synced: false, error: 'Failed to get valid Zoho access token' };
    }

    // Get expense details
    const supabase = createServiceClient();
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return { success: false, synced: false, error: 'Expense not found' };
    }

    // Only sync if already has a Zoho ID
    if (!expense.zoho_expense_id) {
      return { success: true, synced: false, error: 'Expense not yet synced to Zoho' };
    }

    // Update expense in Zoho Books
    const vendorName = expense.vendor?.trim() || 'UNKNOWN VENDOR – REVIEW NEEDED';
    
    const result = await updateZohoExpense({
      accessToken,
      organizationId: integration.tenant_id,
      zohoExpenseId: expense.zoho_expense_id,
      description: expense.description || expense.memo || 'Expense from SiteProc',
      amount: expense.amount,
      date: expense.spent_at || expense.created_at?.split('T')[0],
      category: expense.category,
      vendor: vendorName,
      paymentMethod: expense.payment_method,
    });

    if (!result) {
      console.error('[Zoho AutoSync] Failed to update expense in Zoho');
      return { success: false, synced: false, error: 'Failed to update expense in Zoho Books' };
    }

    console.log(`[Zoho AutoSync] Expense ${expenseId} updated in Zoho`);
    return { success: true, synced: true, zohoId: expense.zoho_expense_id };

  } catch (error) {
    console.error('[Zoho AutoSync] Error updating expense in Zoho:', error);
    return { success: false, synced: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync expense DELETE to Zoho Books
 * Call this before deleting an expense that's synced
 */
export async function syncExpenseDeleteToZoho(
  companyId: string,
  expenseId: string
): Promise<AutoSyncResult> {
  try {
    // Get Zoho integration
    const integration = await getZohoIntegration(companyId);
    if (!integration) {
      return { success: true, synced: false, error: 'Zoho not connected' };
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);
    if (!accessToken) {
      return { success: false, synced: false, error: 'Failed to get valid Zoho access token' };
    }

    // Get expense details
    const supabase = createServiceClient();
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('zoho_expense_id')
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return { success: false, synced: false, error: 'Expense not found' };
    }

    // Only delete from Zoho if it has a Zoho ID
    if (!expense.zoho_expense_id) {
      return { success: true, synced: false, error: 'Expense not synced to Zoho' };
    }

    // Delete expense from Zoho Books
    const result = await deleteZohoExpense({
      accessToken,
      organizationId: integration.tenant_id,
      zohoExpenseId: expense.zoho_expense_id,
    });

    if (!result) {
      console.error('[Zoho AutoSync] Failed to delete expense from Zoho');
      return { success: false, synced: false, error: 'Failed to delete expense from Zoho Books' };
    }

    console.log(`[Zoho AutoSync] Expense ${expenseId} deleted from Zoho`);
    return { success: true, synced: true };

  } catch (error) {
    console.error('[Zoho AutoSync] Error deleting expense from Zoho:', error);
    return { success: false, synced: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Auto-sync an invoice to Zoho Books
 */
export async function autoSyncInvoiceToZoho(
  companyId: string,
  invoiceId: string
): Promise<AutoSyncResult> {
  try {
    // Get Zoho integration
    const integration = await getZohoIntegration(companyId);
    if (!integration) {
      return { success: true, synced: false, error: 'Zoho not connected' };
    }

    // Check if auto-sync is enabled
    if (integration.settings?.auto_sync_invoices === false) {
      return { success: true, synced: false, error: 'Zoho invoice auto-sync disabled' };
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);
    if (!accessToken) {
      return { success: false, synced: false, error: 'Failed to get valid Zoho access token' };
    }

    // Get invoice details
    const supabase = createServiceClient();
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { success: false, synced: false, error: 'Invoice not found' };
    }

    // Check if already synced
    if (invoice.zoho_invoice_id) {
      return { success: true, synced: false, error: 'Already synced to Zoho' };
    }

    // Create invoice in Zoho Books
    const result = await createZohoInvoice({
      accessToken,
      organizationId: integration.tenant_id,
      customerName: invoice.client_name || 'Customer',
      description: invoice.description || `Invoice from SiteProc`,
      amount: invoice.amount,
      date: invoice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      dueDate: invoice.due_date,
      reference: `SP-INV-${invoice.id.slice(0, 8)}`,
    });

    if (!result) {
      return { success: false, synced: false, error: 'Failed to create invoice in Zoho Books' };
    }

    // Update invoice with Zoho ID
    await supabase
      .from('invoices')
      .update({ zoho_invoice_id: result.invoiceId })
      .eq('id', invoiceId);

    console.log(`[Zoho AutoSync] Invoice ${invoiceId} synced to Zoho invoice ${result.invoiceId}`);
    return { success: true, synced: true, zohoId: result.invoiceId };

  } catch (error) {
    console.error('[Zoho AutoSync] Error syncing invoice:', error);
    return { success: false, synced: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Manually sync all unsynced approved expenses to Zoho
 */
export async function syncAllExpensesToZoho(companyId: string): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}> {
  const result = { success: true, synced: 0, failed: 0, errors: [] as string[] };

  try {
    const integration = await getZohoIntegration(companyId);
    if (!integration) {
      return { ...result, success: false, errors: ['Zoho not connected'] };
    }

    const supabase = createServiceClient();
    
    // Get all approved expenses not synced to Zoho
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .is('zoho_expense_id', null);

    if (error) {
      return { ...result, success: false, errors: [`Failed to fetch expenses: ${error.message}`] };
    }

    if (!expenses || expenses.length === 0) {
      return result; // Nothing to sync
    }

    // Sync each expense
    for (const expense of expenses) {
      const syncResult = await autoSyncExpenseToZoho(companyId, expense.id, 'approved');
      
      if (syncResult.synced) {
        result.synced++;
      } else if (!syncResult.success) {
        result.failed++;
        result.errors.push(`Expense ${expense.id}: ${syncResult.error}`);
      }
    }

    return result;
  } catch (error) {
    return { ...result, success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
}
