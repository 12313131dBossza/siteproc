import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/server-utils';
import { getStripe, STRIPE_PLANS } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-service';

// GET /api/billing/sync - Sync subscription status from Stripe
export async function GET() {
  try {
    const { profile, error: profileError } = await getCurrentUserProfile();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can sync billing
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Only admins can sync billing' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const stripe = await getStripe();

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
    }

    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, stripe_customer_id, plan, subscription_status')
      .eq('id', profile.company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!company.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'No Stripe customer linked',
        company: { id: company.id, name: company.name }
      }, { status: 400 });
    }

    // Fetch subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ 
        message: 'No subscriptions found in Stripe',
        company: { id: company.id, name: company.name, stripe_customer_id: company.stripe_customer_id }
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const productId = subscription.items.data[0]?.price?.product as string;
    
    // Fetch product details to get name
    let productName = '';
    if (productId) {
      try {
        const product = await stripe.products.retrieve(productId);
        productName = product.name || '';
      } catch (e) {
        console.error('Failed to fetch product:', e);
      }
    }

    console.log(`[Sync] Subscription found:`, {
      status: subscription.status,
      priceId,
      productId,
      productName,
    });

    // Determine plan from product
    const starterProduct = process.env.STRIPE_STARTER_PRICE_ID || '';
    const proProduct = process.env.STRIPE_PRO_PRICE_ID || '';
    const enterpriseProduct = process.env.STRIPE_ENTERPRISE_PRICE_ID || '';

    let plan = 'starter';
    
    // Check by product ID
    if (productId === proProduct) plan = 'pro';
    else if (productId === enterpriseProduct) plan = 'enterprise';
    else if (productId === starterProduct) plan = 'starter';
    // Check by product name
    else if (productName.toLowerCase().includes('pro')) plan = 'pro';
    else if (productName.toLowerCase().includes('enterprise')) plan = 'enterprise';
    else if (productName.toLowerCase().includes('starter')) plan = 'starter';

    // Update company - try full update first, then fallback to simpler update
    let updateError: any = null;
    
    // Try with all billing columns (no updated_at - companies table may not have it)
    const result1 = await supabase
      .from('companies')
      .update({
        plan,
        subscription_status: subscription.status,
        subscription_ends_at: subscription.cancel_at_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      })
      .eq('id', company.id);

    if (result1.error) {
      console.log('[Sync] Full update failed, trying plan only:', result1.error.message);
      
      // Fallback: just try updating plan column
      const result2 = await supabase
        .from('companies')
        .update({
          plan,
        })
        .eq('id', company.id);
      
      if (result2.error) {
        console.log('[Sync] Plan update failed too:', result2.error.message);
        
        // Last resort: Raw SQL via RPC or just report the plan
        return NextResponse.json({ 
          error: 'Database columns missing. Run ADD-BILLING-COLUMNS.sql in Supabase first.',
          plan_detected: plan,
          details: result2.error,
          sql_to_run: `UPDATE companies SET plan = '${plan}' WHERE id = '${company.id}';`
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced! Plan updated to "${plan}"`,
      details: {
        companyId: company.id,
        customerId: company.stripe_customer_id,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        priceId,
        productId,
        productName,
        plan,
      }
    });

  } catch (error) {
    console.error('[Sync] Error:', error);
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 });
  }
}
