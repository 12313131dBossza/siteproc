'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { Check, CreditCard, Loader2, ExternalLink, AlertCircle, Crown, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface BillingInfo {
  billableUsers: number;
  freeUsers: number;
  totalUsers: number;
  pricePerUser: number;
  monthlyTotal: number;
  atUserLimit: boolean;
  usersByRole: Record<string, number>;
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
  billing?: BillingInfo;
}

// Static plan definitions
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    tagline: 'Solo builders or small teams (1–5 users)',
    limits: 'Up to 5 internal users & 10 active projects',
    features: [
      'Core modules: Projects, Orders, Deliveries, Expenses, Payments',
      'Zoho Books sync (invoices only)',
      'Offline mobile app (works with no signal)',
      'Email alerts',
      'Unlimited free suppliers & clients',
      'Email support (24–48 hours)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    tagline: 'Growing teams (6–30 users)',
    limits: 'Unlimited internal users & unlimited projects',
    popular: true,
    features: [
      'Everything in Starter',
      'Full Zoho Books sync (invoices + expenses + change orders + payments)',
      'Advanced reports & analytics with charts',
      'Custom fields',
      'In-app chat/DM per project',
      'Email notifications',
      'Priority Slack/email support',
      'CSV & PDF export with your logo',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149,
    priceLabel: '$149+',
    tagline: 'Large firms (30+ users)',
    subtitle: 'Custom quote — volume pricing available',
    limits: 'Unlimited internal users & unlimited projects',
    features: [
      'Everything in Pro',
      'Unlimited scale & multi-company support',
      'Dedicated onboarding & training',
      'Custom API & integrations (50+ endpoints)',
      'White-label (your logo, colors, domain)',
      '24/7 phone support',
      'SOC 2 compliance / SLAs / on-premise option',
    ],
  },
];

const IMPORTANT_NOTES = [
  '"Unlimited users" means unlimited internal users + unlimited free suppliers, clients, subcontractors, consultants',
  'Only your internal team (Owner, Admin, Manager, Accountant, etc.) is charged',
  'Suppliers, clients, subcontractors, consultants = always free, no limits',
  'Add or remove internal users anytime — instant prorated charge or credit',
  '14-day Pro trial after private demo (no card required)',
  'Cancel anytime',
];

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle success/cancel from Stripe checkout
    if (searchParams?.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
      // Auto-sync after successful checkout
      syncBilling();
    } else if (searchParams?.get('canceled') === 'true') {
      toast.info('Checkout was canceled');
    }

    fetchBilling();
  }, [searchParams]);

  // Auto-sync subscription from Stripe on page load
  async function syncBilling() {
    setSyncing(true);
    try {
      const res = await fetch('/api/billing/sync');
      const data = await res.json();
      if (data.success) {
        console.log('Subscription synced:', data.message);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
      // Refresh billing data after sync
      fetchBilling();
    }
  }

  async function fetchBilling() {
    try {
      const res = await fetch('/api/billing');
      const data = await res.json();
      setBilling(data);
      
      // Auto-sync if we have a Stripe customer but plan might be out of sync
      if (data.configured && data.company && !syncing) {
        // Only auto-sync on initial load, not on every fetch
        const lastSync = sessionStorage.getItem('lastBillingSync');
        const now = Date.now();
        if (!lastSync || now - parseInt(lastSync) > 60000) { // Sync max once per minute
          sessionStorage.setItem('lastBillingSync', now.toString());
          syncBilling();
        }
      }
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
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
        {/* Current Plan Summary (only show if subscribed) */}
        {billing.subscription && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleManageBilling}
                  disabled={actionLoading === 'portal'}
                  leftIcon={actionLoading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                >
                  Manage Billing
                </Button>
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

            {/* Per-User Billing Breakdown */}
            {billing.billing && currentPlan !== 'free' && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Billing Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Billable Users</p>
                    <p className="text-xl font-bold text-blue-700">{billing.billing.billableUsers}</p>
                    <p className="text-xs text-gray-400">Internal team</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Free Users</p>
                    <p className="text-xl font-bold text-green-700">{billing.billing.freeUsers}</p>
                    <p className="text-xs text-gray-400">Clients & Suppliers</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Price Per User</p>
                    <p className="text-xl font-bold text-purple-700">${billing.billing.pricePerUser}</p>
                    <p className="text-xs text-gray-400">/month</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Monthly Total</p>
                    <p className="text-xl font-bold text-orange-700">
                      ${billing.billing.monthlyTotal.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      ${billing.billing.pricePerUser} × {billing.billing.billableUsers} users
                    </p>
                  </div>
                </div>
                
                {/* User limit warning */}
                {billing.billing.atUserLimit && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      You&apos;ve reached the maximum users for your plan. Upgrade to add more users.
                    </span>
                  </div>
                )}

                {/* User breakdown by role */}
                {billing.billing.usersByRole && Object.keys(billing.billing.usersByRole).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Users by Role</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(billing.billing.usersByRole).map(([role, count]) => (
                        <span 
                          key={role} 
                          className={`px-2 py-1 text-xs rounded-full ${
                            ['client', 'supplier', 'subcontractor'].includes(role.toLowerCase())
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {role}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white border-2 rounded-xl p-6 flex flex-col ${
                    plan.popular
                      ? 'border-purple-500 ring-2 ring-purple-100'
                      : isCurrentPlan
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-4 min-h-[28px]">
                    {plan.popular && (
                      <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>

                  {/* Price */}
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.priceLabel || `$${plan.price}`}
                    </span>
                    <span className="text-gray-500 ml-1">/user/month</span>
                  </div>

                  {/* Subtitle for Enterprise */}
                  {plan.subtitle && (
                    <p className="text-sm text-purple-600 font-medium mt-1">{plan.subtitle}</p>
                  )}

                  {/* Tagline */}
                  <p className="text-sm text-gray-500 mt-2 italic">{plan.tagline}</p>

                  {/* Limits */}
                  <p className="text-sm font-medium text-gray-700 mt-4 pb-4 border-b border-gray-100">
                    {plan.limits}
                  </p>

                  {/* Features */}
                  <ul className="mt-4 space-y-3 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    variant={isCurrentPlan ? 'ghost' : 'primary'}
                    className={`w-full mt-6 ${plan.popular && !isCurrentPlan ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600' : ''}`}
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isCurrentPlan || actionLoading === plan.id}
                  >
                    {actionLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.id === 'enterprise' ? (
                      <>Contact Sales <ExternalLink className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Get Started <ExternalLink className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">Important Notes</h3>
              <ul className="space-y-2">
                {IMPORTANT_NOTES.map((note, i) => (
                  <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
