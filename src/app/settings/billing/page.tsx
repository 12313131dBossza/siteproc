'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { Check, CreditCard, Loader2, ExternalLink, AlertCircle, Crown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  price: number;
  users: number;
  projects: number;
  features: string[];
}

interface BillingData {
  configured: boolean;
  company?: {
    id: string;
    name: string;
    plan: string;
    billingEmail: string;
  };
  subscription?: {
    status: string;
    planId: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  plans: Record<string, Plan>;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle success/cancel from Stripe checkout
    if (searchParams?.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
    } else if (searchParams?.get('canceled') === 'true') {
      toast.info('Checkout was canceled');
    }

    fetchBilling();
  }, [searchParams]);

  async function fetchBilling() {
    try {
      const res = await fetch('/api/billing');
      const data = await res.json();
      setBilling(data);
    } catch (error) {
      console.error('Failed to fetch billing:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(planId: string) {
    setActionLoading(planId);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', planId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      toast.error('Failed to start checkout');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManageBilling() {
    setActionLoading('portal');
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSyncBilling() {
    setActionLoading('sync');
    try {
      const res = await fetch('/api/billing/sync');
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Subscription synced!');
        // Refresh billing data
        fetchBilling();
      } else {
        toast.error(data.error || 'Sync failed');
        console.log('Sync response:', data);
      }
    } catch (error) {
      toast.error('Failed to sync billing');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Billing" description="Manage your subscription and billing">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (!billing?.configured) {
    return (
      <AppLayout title="Billing" description="Manage your subscription and billing">
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Billing Not Configured
            </h3>
            <p className="text-yellow-700">
              Stripe billing integration is not set up. Contact your administrator to configure billing.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentPlan = billing.company?.plan || 'free';
  const plans = Object.values(billing.plans || {});

  // Get display name for current plan
  const getPlanDisplayName = (plan: string) => {
    const planNames: Record<string, string> = {
      'free': 'Free',
      'starter': 'Starter',
      'pro': 'Pro',
      'enterprise': 'Enterprise'
    };
    return planNames[plan.toLowerCase()] || plan;
  };

  return (
    <AppLayout title="Billing" description="Manage your subscription and billing">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Current Plan */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
              <div className="flex items-center gap-2 mt-1">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="text-xl font-bold text-gray-900">
                  {getPlanDisplayName(currentPlan)}
                </span>
                {billing.subscription?.status === 'active' && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Active
                  </span>
                )}
              </div>
              {billing.subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-500 mt-1">
                  {billing.subscription.cancelAtPeriodEnd
                    ? 'Cancels on '
                    : 'Renews on '}
                  {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {billing.subscription && (
              <Button
                variant="ghost"
                onClick={handleManageBilling}
                disabled={actionLoading === 'portal'}
                leftIcon={actionLoading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              >
                Manage Billing
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSyncBilling}
              disabled={actionLoading === 'sync'}
              className="text-gray-500 hover:text-gray-700"
              title="Sync subscription from Stripe"
            >
              {actionLoading === 'sync' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Available Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isUpgrade = plan.price > (billing.plans[currentPlan]?.price || 0);

              return (
                <div
                  key={plan.id}
                  className={`bg-white border-2 rounded-xl p-6 ${
                    isCurrentPlan
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                      Current Plan
                    </div>
                  )}
                  {plan.id === 'pro' && !isCurrentPlan && (
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}{plan.id === 'enterprise' && '+'}
                    </span>
                    <span className="text-gray-500">/user/month</span>
                  </div>

                  <div className="mt-1 text-xs text-gray-400">
                    {plan.id === 'starter' && '($39/user/year - 20% off)'}
                    {plan.id === 'pro' && '($79/user/year - 20% off)'}
                    {plan.id === 'enterprise' && '(Custom quote - 20% off annual)'}
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    {plan.users === -1 ? 'Unlimited users' : `Up to ${plan.users} users`} • 
                    {plan.projects === -1 ? 'Unlimited projects' : `${plan.projects} projects`}
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrentPlan ? 'ghost' : 'primary'}
                    className="w-full mt-6"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isCurrentPlan || actionLoading === plan.id}
                  >
                    {actionLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : isUpgrade ? (
                      <>Upgrade <ExternalLink className="h-4 w-4 ml-1" /></>
                    ) : (
                      'Switch Plan'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing FAQ */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Billing FAQ</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">How does billing work?</p>
              <p className="text-gray-600">
                You'll be billed monthly based on your plan. All plans include a 14-day free trial.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Can I cancel anytime?</p>
              <p className="text-gray-600">
                Yes, you can cancel at any time. Your plan will remain active until the end of your billing period.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">What happens if I upgrade?</p>
              <p className="text-gray-600">
                When you upgrade, you'll only pay the prorated difference for the rest of the billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
