'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  PLANS, 
  PlanId, 
  PlanFeatures, 
  hasFeature, 
  canAddUser, 
  canAddProject, 
  getUpgradeMessage,
  getUserLimitBanner,
  getProjectLimitBanner,
  getRemainingUserSlots,
  getRemainingProjectSlots,
  BILLABLE_ROLES
} from '@/lib/plans';

interface PlanContextType {
  plan: PlanId;
  planName: string;
  isLoading: boolean;
  features: PlanFeatures;
  // Feature checks
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  getUpgradeMessage: (feature: keyof PlanFeatures) => string;
  // Limit checks
  canAddUser: () => boolean;
  canAddProject: () => boolean;
  // Counts
  internalUserCount: number;
  activeProjectCount: number;
  // Remaining slots
  remainingUserSlots: number;
  remainingProjectSlots: number;
  // Banners
  userLimitBanner: { show: boolean; message: string; type: 'warning' | 'error' } | null;
  projectLimitBanner: { show: boolean; message: string; type: 'warning' | 'error' } | null;
  // Refresh
  refresh: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanId>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [internalUserCount, setInternalUserCount] = useState(0);
  const [activeProjectCount, setActiveProjectCount] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlan('free');
        return;
      }

      // Get profile with company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        setPlan('free');
        return;
      }

      setCompanyId(profile.company_id);

      // Get company plan
      const { data: company } = await supabase
        .from('companies')
        .select('plan')
        .eq('id', profile.company_id)
        .single();

      if (company?.plan && ['free', 'starter', 'pro', 'enterprise'].includes(company.plan)) {
        setPlan(company.plan as PlanId);
      } else {
        setPlan('free');
      }

      // Get internal user count (billable roles only)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .in('role', BILLABLE_ROLES)
        .eq('status', 'active');

      setInternalUserCount(userCount || 0);

      // Get active project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .in('status', ['active', 'in_progress', 'pending', 'planning']);

      setActiveProjectCount(projectCount || 0);

    } catch (error) {
      console.error('Error loading plan:', error);
      setPlan('free');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const currentPlan = PLANS[plan];

  // Calculate remaining slots
  const remainingUserSlots = getRemainingUserSlots(plan, internalUserCount);
  const remainingProjectSlots = getRemainingProjectSlots(plan, activeProjectCount);

  // Get banners
  const userLimitBanner = getUserLimitBanner(plan, internalUserCount);
  const projectLimitBanner = getProjectLimitBanner(plan, activeProjectCount);

  const value: PlanContextType = {
    plan,
    planName: currentPlan.name,
    isLoading,
    features: currentPlan.features,
    // Feature checks
    hasFeature: (feature) => hasFeature(plan, feature),
    getUpgradeMessage: (feature) => getUpgradeMessage(feature),
    // Limit checks
    canAddUser: () => canAddUser(plan, internalUserCount),
    canAddProject: () => canAddProject(plan, activeProjectCount),
    // Counts
    internalUserCount,
    activeProjectCount,
    // Remaining slots
    remainingUserSlots,
    remainingProjectSlots,
    // Banners
    userLimitBanner,
    projectLimitBanner,
    // Refresh
    refresh: loadPlan,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

// Default values for SSR/prerendering when provider isn't available
const defaultPlanContext: PlanContextType = {
  plan: 'free',
  planName: 'Free',
  isLoading: true,
  features: PLANS.free.features,
  hasFeature: () => false,
  getUpgradeMessage: () => 'Upgrade your plan to access this feature',
  canAddUser: () => true,
  canAddProject: () => true,
  internalUserCount: 0,
  activeProjectCount: 0,
  remainingUserSlots: 999,
  remainingProjectSlots: 999,
  userLimitBanner: null,
  projectLimitBanner: null,
  refresh: async () => {},
};

export function usePlan() {
  const context = useContext(PlanContext);
  // Return defaults during SSR/prerendering when provider isn't available
  if (!context) {
    return defaultPlanContext;
  }
  return context;
}

/**
 * Hook to check if a specific feature is available
 * Returns { allowed, message } where message is the upgrade prompt if not allowed
 */
export function useFeatureCheck(feature: keyof PlanFeatures) {
  const { hasFeature: check, getUpgradeMessage } = usePlan();
  const allowed = check(feature);
  return {
    allowed,
    message: allowed ? null : getUpgradeMessage(feature),
  };
}
