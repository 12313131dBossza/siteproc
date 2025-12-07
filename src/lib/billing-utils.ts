import { createServiceClient } from '@/lib/supabase-service';
import { BILLABLE_ROLES } from '@/lib/plans';

/**
 * Count billable (internal) users for a company
 * Only counts: owner, admin, manager, bookkeeper, member
 * Excludes: supplier, client, viewer
 */
export async function countBillableUsers(companyId: string): Promise<number> {
  const supabase = createServiceClient();
  
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('role', BILLABLE_ROLES);
  
  if (error) {
    console.error('[Billing] Error counting users:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Get detailed user breakdown for a company
 */
export async function getUserBreakdown(companyId: string): Promise<{
  billable: number;
  free: number;
  total: number;
  byRole: Record<string, number>;
}> {
  const supabase = createServiceClient();
  
  const { data: users, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('company_id', companyId);
  
  if (error || !users) {
    console.error('[Billing] Error getting user breakdown:', error);
    return { billable: 0, free: 0, total: 0, byRole: {} };
  }
  
  const byRole: Record<string, number> = {};
  let billable = 0;
  let free = 0;
  
  for (const user of users) {
    const role = user.role || 'viewer';
    byRole[role] = (byRole[role] || 0) + 1;
    
    if (BILLABLE_ROLES.includes(role)) {
      billable++;
    } else {
      free++;
    }
  }
  
  return {
    billable,
    free,
    total: users.length,
    byRole,
  };
}

/**
 * Update Stripe subscription quantity when users change
 * Call this after adding/removing users
 */
export async function syncSubscriptionQuantity(companyId: string): Promise<{
  success: boolean;
  message: string;
  newQuantity?: number;
}> {
  try {
    // Dynamically import Stripe to avoid circular dependencies
    const { getStripe } = await import('@/lib/stripe');
    const stripe = await getStripe();
    
    if (!stripe) {
      return { success: false, message: 'Stripe not configured' };
    }

    const supabase = createServiceClient();
    
    // Get company's Stripe customer ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, plan')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company?.stripe_customer_id) {
      return { success: false, message: 'No Stripe subscription found' };
    }

    // Count current billable users
    const billableUsers = await countBillableUsers(companyId);
    const quantity = Math.max(1, billableUsers); // Minimum 1 seat

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { success: false, message: 'No active subscription' };
    }

    const subscription = subscriptions.data[0];
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return { success: false, message: 'Invalid subscription structure' };
    }

    // Update the quantity
    await stripe.subscriptionItems.update(subscriptionItemId, {
      quantity,
      proration_behavior: 'create_prorations', // Prorate for immediate changes
    });

    console.log(`[Billing] Updated subscription quantity to ${quantity} for company ${companyId}`);

    return {
      success: true,
      message: `Subscription updated to ${quantity} users`,
      newQuantity: quantity,
    };
  } catch (error) {
    console.error('[Billing] Error syncing subscription quantity:', error);
    return { success: false, message: 'Failed to update subscription' };
  }
}
