import { createServiceClient } from '@/lib/supabase-service';
import { BILLABLE_ROLES } from '@/lib/plans';

/**
 * Count billable (internal) users for a company
 * Only counts: owner, admin, manager, accountant, bookkeeper, member
 * Excludes: supplier, client, viewer, inactive users
 */
export async function countBillableUsers(companyId: string): Promise<number> {
  const supabase = createServiceClient();
  
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('role', BILLABLE_ROLES)
    .neq('status', 'inactive'); // Don't count inactive users
  
  if (error) {
    console.error('[Billing] Error counting users:', error);
    return 0;
  }
  
  console.log(`[Billing] Counted ${count || 0} billable users for company ${companyId}`);
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
    console.log(`[Billing] Starting sync for company ${companyId}`);
    
    // Dynamically import Stripe to avoid circular dependencies
    const { getStripe } = await import('@/lib/stripe');
    const stripe = await getStripe();
    
    if (!stripe) {
      console.log('[Billing] Stripe not configured');
      return { success: false, message: 'Stripe not configured' };
    }

    const supabase = createServiceClient();
    
    // Get company's Stripe customer ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, plan')
      .eq('id', companyId)
      .single();
    
    if (companyError) {
      console.error('[Billing] Error fetching company:', companyError);
      return { success: false, message: 'Failed to fetch company' };
    }
    
    if (!company?.stripe_customer_id) {
      console.log('[Billing] No Stripe customer ID for company');
      return { success: false, message: 'No Stripe subscription found' };
    }

    console.log(`[Billing] Company found: plan=${company.plan}, stripe_customer=${company.stripe_customer_id}`);

    // Count current billable users
    const billableUsers = await countBillableUsers(companyId);
    const quantity = Math.max(1, billableUsers); // Minimum 1 seat

    console.log(`[Billing] Billable users: ${billableUsers}, setting quantity to: ${quantity}`);

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      console.log('[Billing] No active subscription found');
      return { success: false, message: 'No active subscription' };
    }

    const subscription = subscriptions.data[0];
    const subscriptionItemId = subscription.items.data[0]?.id;
    const currentQuantity = subscription.items.data[0]?.quantity || 0;

    console.log(`[Billing] Current subscription: id=${subscription.id}, item=${subscriptionItemId}, current_qty=${currentQuantity}`);

    if (!subscriptionItemId) {
      return { success: false, message: 'Invalid subscription structure' };
    }

    // Only update if quantity changed
    if (currentQuantity === quantity) {
      console.log(`[Billing] Quantity unchanged (${quantity}), skipping update`);
      return { success: true, message: `Quantity already at ${quantity} users`, newQuantity: quantity };
    }

    // Update the quantity
    await stripe.subscriptionItems.update(subscriptionItemId, {
      quantity,
      proration_behavior: 'create_prorations', // Prorate for immediate changes
    });

    console.log(`[Billing] ✓ Updated subscription quantity from ${currentQuantity} to ${quantity} for company ${companyId}`);

    return {
      success: true,
      message: `Subscription updated from ${currentQuantity} to ${quantity} users`,
      newQuantity: quantity,
    };
  } catch (error) {
    console.error('[Billing] Error syncing subscription quantity:', error);
    return { success: false, message: 'Failed to update subscription' };
  }
}
