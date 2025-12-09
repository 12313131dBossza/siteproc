'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePlan } from '@/hooks/usePlan';
import { PlanId, PLANS } from '@/lib/plans';
import { AppLayout } from './app-layout';
import { Lock, ArrowRight, Crown } from 'lucide-react';
import Link from 'next/link';

// Plan hierarchy for comparison
const PLAN_LEVELS: Record<PlanId, number> = {
  'free': 0,
  'starter': 1,
  'pro': 2,
  'enterprise': 3,
};

interface PlanGateProps {
  /** Minimum plan required to access this content */
  minPlan: PlanId;
  /** Content to show if user has access */
  children: ReactNode;
  /** Name of the feature for the upgrade prompt */
  featureName?: string;
}

/**
 * Route-level plan gate that blocks entire pages
 * Use this to wrap page content that requires a specific plan
 * 
 * Usage:
 * <PlanGate minPlan="pro" featureName="Analytics">
 *   <AnalyticsPageContent />
 * </PlanGate>
 */
export function PlanGate({ minPlan, children, featureName }: PlanGateProps) {
  const { plan, isLoading } = usePlan();
  const router = useRouter();

  // During loading, show nothing (prevents flash)
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  // Check if user's plan meets minimum requirement
  const userPlanLevel = PLAN_LEVELS[plan] || 0;
  const requiredLevel = PLAN_LEVELS[minPlan] || 0;
  const hasAccess = userPlanLevel >= requiredLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Get plan details for upgrade prompt
  const requiredPlan = PLANS[minPlan];
  const planName = requiredPlan?.name || minPlan;

  // Show upgrade prompt
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md w-full text-center">
          {/* Lock Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {featureName || 'This Feature'} Requires {planName}
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-8">
            Upgrade to {planName} to unlock {featureName?.toLowerCase() || 'this feature'} and more powerful tools for your team.
          </p>

          {/* What you get */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">What's included in {planName}:</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {requiredPlan?.featureList.slice(0, 5).map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/settings/billing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upgrade to {planName}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center px-6 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
            >
              Go Back
            </button>
          </div>

          {/* Pricing hint */}
          <p className="text-sm text-gray-500 mt-6">
            {planName} starts at ${requiredPlan?.monthlyPrice || 99}/user/month
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

/**
 * Hook to check if current plan meets minimum requirement
 */
export function usePlanGate(minPlan: PlanId) {
  const { plan, isLoading } = usePlan();
  
  const userPlanLevel = PLAN_LEVELS[plan] || 0;
  const requiredLevel = PLAN_LEVELS[minPlan] || 0;
  const hasAccess = userPlanLevel >= requiredLevel;
  
  return { hasAccess, isLoading, currentPlan: plan, requiredPlan: minPlan };
}
