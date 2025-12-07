'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS, PlanId, PlanFeatures, hasFeature, canAddUser, canAddProject, getUpgradeMessage } from '@/lib/plans';

interface PlanContextType {
  plan: PlanId;
  planName: string;
  isLoading: boolean;
  features: PlanFeatures;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  canAddUser: (currentCount: number) => boolean;
  canAddProject: (currentCount: number) => boolean;
  getUpgradeMessage: (feature: keyof PlanFeatures) => string;
  refresh: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanId>('free');
  const [isLoading, setIsLoading] = useState(true);

  const loadPlan = async () => {
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
    } catch (error) {
      console.error('Error loading plan:', error);
      setPlan('free');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const currentPlan = PLANS[plan];

  const value: PlanContextType = {
    plan,
    planName: currentPlan.name,
    isLoading,
    features: currentPlan.features,
    hasFeature: (feature) => hasFeature(plan, feature),
    canAddUser: (currentCount) => canAddUser(plan, currentCount),
    canAddProject: (currentCount) => canAddProject(plan, currentCount),
    getUpgradeMessage: (feature) => getUpgradeMessage(feature),
    refresh: loadPlan,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
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
