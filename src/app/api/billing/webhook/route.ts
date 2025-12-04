import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-service';

// POST /api/billing/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = await verifyWebhookSignature(payload, signature);
    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createServiceClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const companyId = session.metadata?.companyId;
        const customerId = session.customer;

        if (companyId && customerId) {
          // Update company with customer ID and plan
          await supabase
            .from('companies')
            .update({
              stripe_customer_id: customerId,
              plan: 'pro', // Will be updated based on subscription
              updated_at: new Date().toISOString(),
            })
            .eq('id', companyId);

          console.log(`[Webhook] Checkout completed for company ${companyId}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const companyId = subscription.metadata?.companyId;

        if (companyId) {
          // Determine plan from price ID
          let plan = 'starter';
          const priceId = subscription.items?.data[0]?.price?.id;
          
          if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
            plan = 'pro';
          } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
            plan = 'enterprise';
          }

          await supabase
            .from('companies')
            .update({
              plan,
              subscription_status: subscription.status,
              subscription_ends_at: subscription.cancel_at_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', companyId);

          console.log(`[Webhook] Subscription ${event.type} for company ${companyId}: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const companyId = subscription.metadata?.companyId;

        if (companyId) {
          // Downgrade to free plan
          await supabase
            .from('companies')
            .update({
              plan: 'free',
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', companyId);

          console.log(`[Webhook] Subscription canceled for company ${companyId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        console.log(`[Webhook] Payment failed for invoice ${invoice.id}`);
        // Could send notification email here
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};
