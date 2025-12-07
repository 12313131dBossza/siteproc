import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/server-utils';
import { createCheckoutSession, createPortalSession, getSubscription, getOrCreateCustomer, STRIPE_PLANS, isStripeConfigured } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-service';

// GET /api/billing - Get current billing status
export async function GET() {
  try {
    console.log('[Billing] GET request started');
    const { profile, error: profileError } = await getCurrentUserProfile();

    if (profileError || !profile) {
      console.log('[Billing] Unauthorized - no profile');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Billing] User:', profile.email, 'Company:', profile.company_id);

    // Check if Stripe is configured
    const stripeConfigured = await isStripeConfigured();
    console.log('[Billing] Stripe configured:', stripeConfigured);
    
    if (!stripeConfigured) {
      return NextResponse.json({
        configured: false,
        message: 'Stripe billing is not configured',
        plans: STRIPE_PLANS
      });
    }

    const supabase = createServiceClient();

    // Get company billing info - try with all columns first, fallback to basic
    let company: any = null;
    let companyError: any = null;
    
    // Try with billing columns
    const result1 = await supabase
      .from('companies')
      .select('id, name, stripe_customer_id, plan, billing_email')
      .eq('id', profile.company_id)
      .single();
    
    if (result1.error) {
      console.log('[Billing] Full select failed, trying basic:', result1.error.message);
      // Fallback to basic columns if billing columns don't exist
      const result2 = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', profile.company_id)
        .single();
      
      if (result2.data) {
        company = { ...result2.data, stripe_customer_id: null, plan: 'free', billing_email: null };
      }
      companyError = result2.error;
    } else {
      company = result1.data;
    }

    console.log('[Billing] Company lookup:', company ? `Found ${company.name}` : 'Not found', companyError?.message || '');

    if (companyError || !company) {
      console.error('[Billing] Company not found for profile:', profile.company_id, companyError);
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let subscription = null;
    if (company.stripe_customer_id) {
      subscription = await getSubscription(company.stripe_customer_id);
    }

    return NextResponse.json({
      configured: true,
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan || 'free',
        billingEmail: company.billing_email,
      },
      subscription,
      plans: STRIPE_PLANS,
    });
  } catch (error) {
    console.error('[Billing] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing - Create checkout or portal session
export async function POST(request: NextRequest) {
  try {
    const { profile, error: profileError } = await getCurrentUserProfile();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can manage billing
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Only admins and owners can manage billing' }, { status: 403 });
    }

    if (!(await isStripeConfigured())) {
      return NextResponse.json({ error: 'Stripe billing is not configured' }, { status: 400 });
    }

    const body = await request.json();
    const { action, planId } = body;

    const supabase = createServiceClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://siteproc1.vercel.app';

    // Get company info - try with billing columns, fallback to basic
    let company: any = null;
    
    const result1 = await supabase
      .from('companies')
      .select('id, name, stripe_customer_id, billing_email')
      .eq('id', profile.company_id)
      .single();
    
    if (result1.error) {
      // Fallback to basic columns
      const result2 = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', profile.company_id)
        .single();
      
      if (result2.data) {
        company = { ...result2.data, stripe_customer_id: null, billing_email: null };
      }
    } else {
      company = result1.data;
    }

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      customerId = await getOrCreateCustomer({
        companyId: company.id,
        email: company.billing_email || profile.email || '',
        name: company.name,
      });

      if (customerId) {
        // Save customer ID to company
        await supabase
          .from('companies')
          .update({ stripe_customer_id: customerId })
          .eq('id', company.id);
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    if (action === 'checkout') {
      // Create checkout session for new subscription or upgrade
      const plan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      const session = await createCheckoutSession({
        companyId: company.id,
        customerId,
        priceId: plan.priceOrProductId, // Can be price_xxx or prod_xxx
        successUrl: `${baseUrl}/settings/billing?success=true`,
        cancelUrl: `${baseUrl}/settings/billing?canceled=true`,
        email: company.billing_email || profile.email,
      });

      if (!session) {
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
      }

      return NextResponse.json({ url: session.url });
    }

    if (action === 'portal') {
      // Create billing portal session
      const session = await createPortalSession({
        customerId,
        returnUrl: `${baseUrl}/settings/billing`,
      });

      if (!session) {
        return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
      }

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Billing] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
