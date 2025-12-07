/**
 * Stripe Integration for SiteProc Billing
 * Handles subscription management, checkout, and billing portal
 * 
 * SETUP: Run `npm install stripe` to enable Stripe billing
 */

// Stripe types (inline to avoid requiring the package)
interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

interface StripeSubscription {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: { id: string };
    }>;
  };
  metadata?: Record<string, string>;
}

interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer?: string;
  metadata?: Record<string, string>;
}

// Lazy load Stripe to avoid build errors if not installed
let stripe: any = null;
async function getStripe() {
  if (stripe) return stripe;
  
  console.log('[Stripe] Checking STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET (length: ' + process.env.STRIPE_SECRET_KEY.length + ')' : 'NOT SET');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[Stripe] No STRIPE_SECRET_KEY found');
    return null;
  }

  try {
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia' as any,
    });
    console.log('[Stripe] Successfully initialized Stripe client');
    return stripe;
  } catch (error) {
    console.error('[Stripe] Failed to initialize:', error);
    return null;
  }
}

// Product IDs for different plans (set these in your Stripe Dashboard)
// These can be either Price IDs (price_xxx) or Product IDs (prod_xxx)
// If Product IDs are used, we'll fetch the default price automatically
// Pricing: Per internal user per month. Annual = 20% off
// See /src/lib/plans.ts for full feature definitions
export const STRIPE_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceOrProductId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    price: 49, // Per user/month ($39/year = $468/year)
    annualPrice: 39,
    users: 5,
    projects: 10,
    targetAudience: 'Solo builders or small teams (1-5 users)',
    features: [
      'Up to 5 internal users & 10 active projects',
      'Core modules: deliveries, orders, projects, basic payments',
      'QuickBooks/Xero sync (invoices only)',
      'Offline PWA & WhatsApp alerts',
      'Unlimited free external users (suppliers & clients)',
      'Email support (24-48 hours)',
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceOrProductId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    price: 99, // Per user/month ($79/year = $948/year)
    annualPrice: 79,
    users: -1, // Unlimited
    projects: -1, // Unlimited
    targetAudience: 'Growing teams (6-30 users)',
    features: [
      'Unlimited users & projects',
      'Everything in Starter',
      'Advanced reports/analytics/custom fields',
      'Full QuickBooks/Xero sync (expenses, change orders, payments)',
      'In-app DM/chat per project',
      'Email/SMS notifications',
      'Priority Slack/email support',
      'CSV/PDF export with charts',
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceOrProductId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    price: 149, // Starting price (custom quote, $99-$129/user after volume discount)
    annualPrice: 99,
    users: -1, // Unlimited
    projects: -1, // Unlimited
    targetAudience: 'Large firms (30+ users)',
    features: [
      'Everything in Pro',
      'Unlimited scale/multi-company',
      'Dedicated onboarding & training',
      'Custom API/integrations (50+ endpoints)',
      'White-label (your logo, colors, domain)',
      '24/7 phone support',
      'SOC 2 compliance / SLAs / on-premise option',
    ]
  }
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

/**
 * Get the actual price ID from a price or product ID
 * If given a product ID (prod_xxx), fetches the default price
 */
async function getPriceId(priceOrProductId: string): Promise<string | null> {
  // If it's already a price ID, return it
  if (priceOrProductId.startsWith('price_')) {
    return priceOrProductId;
  }
  
  // If it's a product ID, fetch the default price
  if (priceOrProductId.startsWith('prod_')) {
    const stripeClient = await getStripe();
    if (!stripeClient) return null;
    
    try {
      const prices = await stripeClient.prices.list({
        product: priceOrProductId,
        active: true,
        limit: 1,
      });
      
      if (prices.data.length > 0) {
        return prices.data[0].id;
      }
    } catch (error) {
      console.error('[Stripe] Failed to fetch price for product:', priceOrProductId, error);
    }
  }
  
  return priceOrProductId; // Return as-is as fallback
}

/**
 * Check if Stripe is configured
 */
export async function isStripeConfigured(): Promise<boolean> {
  const stripeClient = await getStripe();
  return !!stripeClient && !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession({
  companyId,
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  email,
}: {
  companyId: string;
  customerId?: string;
  priceId: string; // Can be price_xxx or prod_xxx
  successUrl: string;
  cancelUrl: string;
  email?: string;
}): Promise<{ sessionId: string; url: string } | null> {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    console.error('[Stripe] Not configured - missing STRIPE_SECRET_KEY or stripe package');
    return null;
  }

  // Resolve the actual price ID (handles prod_xxx -> price_xxx conversion)
  const resolvedPriceId = await getPriceId(priceId);
  if (!resolvedPriceId) {
    console.error('[Stripe] Could not resolve price ID for:', priceId);
    return null;
  }

  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        companyId,
      },
      subscription_data: {
        metadata: {
          companyId,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    console.error('[Stripe] Failed to create checkout session:', error);
    return null;
  }
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string } | null> {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    console.error('[Stripe] Not configured');
    return null;
  }

  try {
    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error('[Stripe] Failed to create portal session:', error);
    return null;
  }
}

/**
 * Get subscription details for a customer
 */
export async function getSubscription(customerId: string): Promise<{
  status: string;
  planId: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
} | null> {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    return null;
  }

  try {
    const subscriptions = await stripeClient.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return null;
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;

    // Map price ID to plan (check both price IDs and resolved product prices)
    const plan = Object.values(STRIPE_PLANS).find(p => 
      p.priceOrProductId === priceId || p.priceOrProductId.includes(priceId)
    );

    return {
      status: subscription.status,
      planId: plan?.id || 'unknown',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error('[Stripe] Failed to get subscription:', error);
    return null;
  }
}

/**
 * Create or get a Stripe customer for a company
 */
export async function getOrCreateCustomer({
  companyId,
  email,
  name,
}: {
  companyId: string;
  email: string;
  name: string;
}): Promise<string | null> {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    return null;
  }

  try {
    // Search for existing customer
    const existing = await stripeClient.customers.search({
      query: `metadata['companyId']:'${companyId}'`,
    });

    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    // Create new customer
    const customer = await stripeClient.customers.create({
      email,
      name,
      metadata: {
        companyId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error('[Stripe] Failed to get/create customer:', error);
    return null;
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  const stripeClient = await getStripe();
  if (!stripeClient) {
    return false;
  }

  try {
    await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return true;
  } catch (error) {
    console.error('[Stripe] Failed to cancel subscription:', error);
    return false;
  }
}

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<any | null> {
  const stripeClient = await getStripe();
  if (!stripeClient || !process.env.STRIPE_WEBHOOK_SECRET) {
    return null;
  }

  try {
    return stripeClient.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[Stripe] Webhook signature verification failed:', error);
    return null;
  }
}

// Export getStripe for advanced usage
export { getStripe };
