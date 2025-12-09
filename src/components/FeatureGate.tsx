'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePlan } from '@/hooks/usePlan';
import { PlanFeatures, getRequiredPlan, PLANS } from '@/lib/plans';
import { Lock, Crown, ArrowUpRight } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  /** How to handle blocked features: hide, disable, or upgrade-prompt */
  mode?: 'hide' | 'disable' | 'upgrade-prompt';
}

/**
 * Wraps content that requires a specific plan feature.
 * If the user doesn't have access, shows an upgrade prompt or hides the content.
 * 
 * Usage:
 * <FeatureGate feature="advancedReports">
 *   <AdvancedReportsComponent />
 * </FeatureGate>
 * 
 * <FeatureGate feature="inAppChat" mode="disable">
 *   <ChatButton />
 * </FeatureGate>
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true,
  mode = 'upgrade-prompt'
}: FeatureGateProps) {
  const { hasFeature, getUpgradeMessage, isLoading } = usePlan();

  if (isLoading) {
    return null;
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Get required plan info
  const requiredPlan = getRequiredPlan(feature);
  const requiredPlanName = PLANS[requiredPlan]?.name || 'Pro';

  // Handle different modes
  if (mode === 'hide' || !showUpgradePrompt) {
    return null;
  }

  if (mode === 'disable') {
    return (
      <div className="opacity-50 pointer-events-none cursor-not-allowed relative group">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white px-3 py-2 rounded-lg shadow-lg text-xs text-gray-700 max-w-xs text-center">
            <Lock className="h-3 w-3 inline mr-1" />
            {requiredPlanName} feature
          </div>
        </div>
      </div>
    );
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
        Upgrade to {requiredPlanName}
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

  const requiredPlan = getRequiredPlan(feature);
  const requiredPlanName = PLANS[requiredPlan]?.name || 'Pro';

  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      <Crown className="h-3 w-3 mr-1" />
      {requiredPlanName}
    </span>
  );
}

/**
 * Banner that shows when a feature is not available
 */
export function UpgradeBanner({ feature, className = '' }: { feature: keyof PlanFeatures; className?: string }) {
  const { hasFeature, getUpgradeMessage } = usePlan();

  if (hasFeature(feature)) {
    return null;
  }

  const requiredPlan = getRequiredPlan(feature);
  const requiredPlanName = PLANS[requiredPlan]?.name || 'Pro';
  const message = getUpgradeMessage(feature);

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-purple-600" />
          <span className="text-sm text-purple-800">{message}</span>
        </div>
        <Link 
          href="/settings/billing"
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all inline-flex items-center gap-1"
        >
          Upgrade to {requiredPlanName}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Red limit banner for when user hits limits (users/projects)
 */
export function LimitBanner({ 
  message, 
  type = 'error',
  className = '' 
}: { 
  message: string; 
  type?: 'warning' | 'error';
  className?: string;
}) {
  const bgColor = type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  const textColor = type === 'error' ? 'text-red-800' : 'text-yellow-800';
  const iconColor = type === 'error' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className={`${bgColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Lock className={`h-4 w-4 ${iconColor}`} />
          <span className={`text-sm ${textColor}`}>{message}</span>
        </div>
        <Link 
          href="/settings/billing"
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all inline-flex items-center gap-1"
        >
          Upgrade to Pro
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Hook-style check for use in event handlers
 */
export function useFeatureGate() {
  const { hasFeature, getUpgradeMessage, plan } = usePlan();

  return {
    /**
     * Check if feature is allowed
     */
    checkFeature: (feature: keyof PlanFeatures): boolean => {
      return hasFeature(feature);
    },
    
    /**
     * Get upgrade message for a feature
     */
    getMessage: (feature: keyof PlanFeatures): string => {
      return getUpgradeMessage(feature);
    },
    
    /**
     * Get the current plan
     */
    currentPlan: plan,
  };
}
