import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, STRIPE_PLANS } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-service';
import { sendEmail, isEmailEnabled } from '@/lib/email';

// Helper to determine plan from price/product ID
function determinePlan(priceId: string | null, productId: string | null, productName?: string | null): string {
  const starterProduct = process.env.STRIPE_STARTER_PRICE_ID || '';
  const proProduct = process.env.STRIPE_PRO_PRICE_ID || '';
  const enterpriseProduct = process.env.STRIPE_ENTERPRISE_PRICE_ID || '';
  
  console.log(`[Webhook] Determining plan:`);
  console.log(`  - priceId: ${priceId}`);
  console.log(`  - productId: ${productId}`);
  console.log(`  - productName: ${productName}`);
  console.log(`  - Env starter: ${starterProduct}`);
  console.log(`  - Env pro: ${proProduct}`);
  console.log(`  - Env enterprise: ${enterpriseProduct}`);
  
  // Check product ID against env vars (most reliable)
  // Env vars can be either prod_xxx or price_xxx
  if (productId) {
    if (productId === proProduct) return 'pro';
    if (productId === enterpriseProduct) return 'enterprise';
    if (productId === starterProduct) return 'starter';
  }
  
  // Check price ID against env vars  
  if (priceId) {
    if (priceId === proProduct) return 'pro';
    if (priceId === enterpriseProduct) return 'enterprise';
    if (priceId === starterProduct) return 'starter';
  }
  
  // Fallback: check product name (case insensitive)
  if (productName) {
    const nameLower = productName.toLowerCase();
    console.log(`  - Checking product name: "${nameLower}"`);
    if (nameLower.includes('enterprise')) return 'enterprise';
    if (nameLower.includes('pro')) return 'pro';
    if (nameLower.includes('starter')) return 'starter';
  }
  
  // Last resort: check if productId/priceId contains plan name
  const allIds = `${priceId || ''} ${productId || ''}`.toLowerCase();
  if (allIds.includes('enterprise')) return 'enterprise';
  if (allIds.includes('pro')) return 'pro';
  if (allIds.includes('starter')) return 'starter';
  
  // Default to starter if we can't determine
  console.log('[Webhook] Could not determine plan, defaulting to starter');
  return 'starter';
}

// Send welcome email when subscription is activated
async function sendWelcomeEmail(email: string, companyName: string, plan: string) {
  if (!isEmailEnabled()) {
    console.log('[Webhook] Email not enabled, skipping welcome email');
    return;
  }

  const planDetails = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
  const planName = planDetails?.name || plan.charAt(0).toUpperCase() + plan.slice(1);
  const features = planDetails?.features || [];

  const featuresList = features.map(f => `✓ ${f}`).join('\n');
  const featuresHtml = features.map(f => `<li style="margin: 8px 0;">✓ ${f}</li>`).join('');

  try {
    await sendEmail({
      to: email,
      subject: `🎉 Your ${planName} plan is now active!`,
      text: `
Welcome to SiteProc ${planName}!

Hi ${companyName},

Great news! Your ${planName} plan is now active and you have immediate access to all features.

Here's what you unlocked:
${featuresList}

Get started now: https://siteproc1.vercel.app/dashboard

Need help? Reply to this email or visit our help center.

Thank you for choosing SiteProc!

Best regards,
The SiteProc Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">🎉 Welcome to ${planName}!</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi <strong>${companyName}</strong>,</p>
    <p>Great news! Your <strong>${planName} plan</strong> is now active and you have immediate access to all features.</p>
    
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">Here's what you unlocked:</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${featuresHtml}
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://siteproc1.vercel.app/dashboard" style="background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        Go to Dashboard →
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">Need help? Reply to this email or visit our help center.</p>
    <p>Thank you for choosing SiteProc!</p>
    <p style="margin-bottom: 0;"><strong>The SiteProc Team</strong></p>
  </div>
</body>
</html>
      `.trim()
    });
    console.log(`[Webhook] Welcome email sent to ${email} for ${planName} plan`);
  } catch (error) {
    console.error('[Webhook] Failed to send welcome email:', error);
  }
}

// Send payment failed email
async function sendPaymentFailedEmail(email: string, companyName: string) {
  if (!isEmailEnabled()) {
    console.log('[Webhook] Email not enabled, skipping payment failed email');
    return;
  }

  try {
    await sendEmail({
      to: email,
      subject: '⚠️ Payment failed - Action required',
      text: `
Hi ${companyName},

We were unable to process your latest payment for SiteProc.

Please update your payment method to avoid any interruption in service:
https://siteproc1.vercel.app/settings/billing

If you've already updated your payment details, please disregard this email.

Need help? Reply to this email and we'll assist you.

Best regards,
The SiteProc Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f59e0b; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">⚠️ Payment Failed</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi <strong>${companyName}</strong>,</p>
    <p>We were unable to process your latest payment for SiteProc.</p>
    <p>Please update your payment method to avoid any interruption in service.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://siteproc1.vercel.app/settings/billing" style="background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        Update Payment Method →
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">If you've already updated your payment details, please disregard this email.</p>
    <p>Need help? Reply to this email and we'll assist you.</p>
    <p style="margin-bottom: 0;"><strong>The SiteProc Team</strong></p>
  </div>
</body>
</html>
      `.trim()
    });
    console.log(`[Webhook] Payment failed email sent to ${email}`);
  } catch (error) {
    console.error('[Webhook] Failed to send payment failed email:', error);
  }
}

// POST /api/billing/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 1. VERIFY - Security check that this is really from Stripe
    const event = await verifyWebhookSignature(payload, signature);
    if (!event) {
      console.error('[Webhook] Invalid signature - request rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[Webhook] ✓ Verified event: ${event.type} (${event.id})`);

    const supabase = createServiceClient();

    switch (event.type) {
      // ============================================
      // CHECKOUT COMPLETED - User just paid!
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const companyId = session.metadata?.companyId;
        const customerId = session.customer;
        const customerEmail = session.customer_email || session.customer_details?.email;

        console.log(`[Webhook] Checkout completed - Company: ${companyId}, Customer: ${customerId}`);

        if (companyId && customerId) {
          // Get subscription details to determine plan
          const subscriptionId = session.subscription;
          let plan = 'starter';
          let periodEnd: string | null = null;

          if (subscriptionId) {
            // Stripe sends subscription.created event separately, but we can also check here
            // The subscription event will have more details
            console.log(`[Webhook] Subscription ID: ${subscriptionId}`);
          }

          // 2. UPDATE DATABASE - Link Stripe customer to company
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              stripe_customer_id: customerId,
              subscription_status: 'active',
            })
            .eq('id', companyId);

          if (updateError) {
            console.error('[Webhook] Failed to update company:', updateError);
          } else {
            console.log(`[Webhook] ✓ Company ${companyId} linked to Stripe customer ${customerId}`);
          }

          // Get company details for welcome email
          const { data: company } = await supabase
            .from('companies')
            .select('name, billing_email')
            .eq('id', companyId)
            .single();

          // Send welcome email (plan will be confirmed by subscription.created event)
          if (customerEmail || company?.billing_email) {
            await sendWelcomeEmail(
              customerEmail || company?.billing_email,
              company?.name || 'there',
              plan
            );
          }
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION CREATED/UPDATED - Plan details confirmed
      // ============================================
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const companyId = subscription.metadata?.companyId;
        
        // Get price, product IDs, and product name
        const priceId = subscription.items?.data[0]?.price?.id;
        const productId = subscription.items?.data[0]?.price?.product;
        const productName = subscription.items?.data[0]?.price?.product?.name || 
                           subscription.items?.data[0]?.plan?.product?.name ||
                           subscription.plan?.product?.name;
        
        // Determine the plan
        const plan = determinePlan(priceId, productId, productName);
        const status = subscription.status; // 'active', 'past_due', 'canceled', etc.
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        console.log(`[Webhook] Subscription ${event.type} - Customer: ${customerId}, Plan: ${plan}, Status: ${status}`);

        // Find company by Stripe customer ID (more reliable than metadata)
        let targetCompanyId = companyId;
        
        if (!targetCompanyId && customerId) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (company) {
            targetCompanyId = company.id;
          }
        }

        if (targetCompanyId) {
          // 3. UPDATE PLAN - Immediately change their plan in database
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              plan,
              subscription_status: status,
              subscription_ends_at: subscription.cancel_at_period_end ? periodEnd : null,
            })
            .eq('id', targetCompanyId);

          if (updateError) {
            console.error('[Webhook] Failed to update subscription:', updateError);
          } else {
            console.log(`[Webhook] ✓ Company ${targetCompanyId} upgraded to ${plan} (${status})`);
          }

          // If this is a new subscription (created), send welcome email
          if (event.type === 'customer.subscription.created' && status === 'active') {
            const { data: company } = await supabase
              .from('companies')
              .select('name, billing_email')
              .eq('id', targetCompanyId)
              .single();

            if (company?.billing_email) {
              await sendWelcomeEmail(company.billing_email, company.name, plan);
            }
          }
        } else {
          console.warn(`[Webhook] Could not find company for customer ${customerId}`);
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION DELETED - Canceled
      // ============================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const companyId = subscription.metadata?.companyId;

        console.log(`[Webhook] Subscription canceled - Customer: ${customerId}`);

        // Find company by Stripe customer ID
        let targetCompanyId = companyId;
        
        if (!targetCompanyId && customerId) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (company) {
            targetCompanyId = company.id;
          }
        }

        if (targetCompanyId) {
          // Downgrade to free plan
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              plan: 'free',
              subscription_status: 'canceled',
              subscription_ends_at: new Date().toISOString(),
            })
            .eq('id', targetCompanyId);

          if (updateError) {
            console.error('[Webhook] Failed to cancel subscription:', updateError);
          } else {
            console.log(`[Webhook] ✓ Company ${targetCompanyId} downgraded to free`);
          }
        }
        break;
      }

      // ============================================
      // PAYMENT FAILED - Send reminder email
      // ============================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const customerEmail = invoice.customer_email;

        console.log(`[Webhook] Payment failed - Customer: ${customerId}`);

        // Find company by Stripe customer ID
        const { data: company } = await supabase
          .from('companies')
          .select('id, name, billing_email')
          .eq('stripe_customer_id', customerId)
          .single();

        if (company) {
          // Update status to past_due
          await supabase
            .from('companies')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', company.id);

          console.log(`[Webhook] ✓ Company ${company.id} marked as past_due`);

          // Send payment failed email
          const email = customerEmail || company.billing_email;
          if (email) {
            await sendPaymentFailedEmail(email, company.name);
          }
        }
        break;
      }

      // ============================================
      // INVOICE PAID - Successful recurring payment
      // ============================================
      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        // Only process subscription invoices (not one-time)
        if (invoice.subscription) {
          console.log(`[Webhook] Invoice paid - Customer: ${customerId}`);

          // Find company and ensure status is active
          const { data: company } = await supabase
            .from('companies')
            .select('id, subscription_status')
            .eq('stripe_customer_id', customerId)
            .single();

          if (company && company.subscription_status !== 'active') {
            await supabase
              .from('companies')
              .update({
                subscription_status: 'active',
              })
              .eq('id', company.id);

            console.log(`[Webhook] ✓ Company ${company.id} status restored to active`);
          }
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Webhook] ✓ Completed in ${elapsed}ms`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// Disable body parsing for webhook (needed for signature verification)
export const config = {
  api: {
    bodyParser: false,
  },
};
