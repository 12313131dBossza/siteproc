'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePlan } from '@/hooks/usePlan';
import { PlanFeatures } from '@/lib/plans';
import { Lock, Crown } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Wraps content that requires a specific plan feature.
 * If the user doesn't have access, shows an upgrade prompt.
 * 
 * Usage:
 * <FeatureGate feature="advancedReports">
 *   <AdvancedReportsComponent />
 * </FeatureGate>
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { hasFeature, getUpgradeMessage, isLoading } = usePlan();

  if (isLoading) {
    return null; // Or a loading skeleton
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <Lock className="h-10 w-10 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-600 mb-4">{getUpgradeMessage(feature)}</p>
      <Link 
        href="/settings/billing"
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        <Crown className="h-4 w-4" />
        Upgrade Plan
      </Link>
    </div>
  );
}

/**
 * Inline upgrade badge for buttons/links that require a higher plan
 */
export function UpgradeBadge({ feature }: { feature: keyof PlanFeatures }) {
  const { hasFeature } = usePlan();

  if (hasFeature(feature)) {
    return null;
  }

  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      <Crown className="h-3 w-3 mr-1" />
      Pro
    </span>
  );
}

/**
 * Hook-style check for use in event handlers
 */
export function useFeatureGate() {
  const { hasFeature, getUpgradeMessage, plan } = usePlan();

  return {
    /**
     * Check if feature is allowed, show toast if not
     */
    checkFeature: (feature: keyof PlanFeatures): boolean => {
      if (hasFeature(feature)) {
        return true;
      }
      // Could show a toast here
      console.warn(getUpgradeMessage(feature));
      return false;
    },
    
    /**
     * Get the current plan
     */
    currentPlan: plan,
  };
}
