/**
 * SiteProc Pricing Plans - December 2025
 * 
 * This file defines all plan features, limits, and pricing.
 * Used for both display and feature gating.
 * 
 * PRICING MODEL:
 * - All plans are PER INTERNAL USER (owner, admin, manager, bookkeeper, member)
 * - External users (client, supplier, contractor, consultant) are ALWAYS FREE
 * - Enterprise has volume discounts based on user count
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

// Internal roles that count toward billing (PAID)
export const BILLABLE_ROLES = ['owner', 'admin', 'manager', 'accountant', 'bookkeeper', 'member'];

// External roles that are ALWAYS FREE (never charged)
export const FREE_ROLES = ['client', 'supplier', 'contractor', 'consultant', 'subcontractor', 'viewer'];

/**
 * Enterprise volume discount tiers
 * Price per user decreases as you add more users
 */
export const ENTERPRISE_TIERS = [
  { minUsers: 1, maxUsers: 15, pricePerUser: 149 },
  { minUsers: 16, maxUsers: 30, pricePerUser: 129 },
  { minUsers: 31, maxUsers: 75, pricePerUser: 99 },
  { minUsers: 76, maxUsers: Infinity, pricePerUser: 79 },
];

/**
 * Calculate Enterprise price per user based on total user count
 */
export function getEnterprisePricePerUser(userCount: number): number {
  for (const tier of ENTERPRISE_TIERS) {
    if (userCount >= tier.minUsers && userCount <= tier.maxUsers) {
      return tier.pricePerUser;
    }
  }
  return ENTERPRISE_TIERS[ENTERPRISE_TIERS.length - 1].pricePerUser;
}

/**
 * Calculate total monthly cost for a plan
 */
export function calculateMonthlyTotal(planId: PlanId, userCount: number): number {
  if (userCount <= 0) return 0;
  
  switch (planId) {
    case 'free':
      return 0;
    case 'starter':
      // $49/user, max 5 users
      return Math.min(userCount, 5) * 49;
    case 'pro':
      // $99/user, unlimited
      return userCount * 99;
    case 'enterprise':
      // Volume discount based on total users
      const pricePerUser = getEnterprisePricePerUser(userCount);
      return userCount * pricePerUser;
    default:
      return 0;
  }
}

/**
 * Get price per user for display
 */
export function getPricePerUser(planId: PlanId, userCount: number = 1): number {
  switch (planId) {
    case 'free':
      return 0;
    case 'starter':
      return 49;
    case 'pro':
      return 99;
    case 'enterprise':
      return getEnterprisePricePerUser(userCount);
    default:
      return 0;
  }
}

/**
 * Check if user is at plan limit
 */
export function isAtUserLimit(planId: PlanId, currentUserCount: number): boolean {
  if (planId === 'starter' && currentUserCount >= 5) {
    return true;
  }
  return false;
}

/**
 * Get upgrade message when at user limit
 */
export function getUserLimitMessage(planId: PlanId, currentUserCount: number): string | null {
  if (planId === 'starter' && currentUserCount >= 5) {
    return 'You\'ve reached the 5 user limit on Starter. Upgrade to Pro for unlimited users.';
  }
  if (planId === 'starter' && currentUserCount >= 4) {
    return 'You have 1 user slot remaining. Upgrade to Pro for unlimited users.';
  }
  return null;
}

export interface PlanFeatures {
  // Limits
  maxInternalUsers: number; // -1 = unlimited
  maxProjects: number; // -1 = unlimited
  
  // Core features (all plans)
  deliveries: boolean;
  orders: boolean;
  projects: boolean;
  basicPayments: boolean;
  
  // Starter+ features
  quickbooksInvoicesOnly: boolean;
  offlinePwa: boolean;
  whatsappAlerts: boolean;
  unlimitedExternalUsers: boolean; // suppliers, clients
  
  // Pro+ features
  advancedReports: boolean;
  customFields: boolean;
  csvPdfExport: boolean;
  fullQuickbooksSync: boolean; // expenses, change orders, payments
  inAppChat: boolean;
  emailSmsNotifications: boolean;
  prioritySupport: boolean;
  
  // Enterprise features
  multiCompany: boolean;
  dedicatedOnboarding: boolean;
  customApi: boolean;
  whiteLabel: boolean;
  phoneSupport: boolean;
  soc2Compliance: boolean;
  onPremise: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number; // per internal user
  annualPrice: number; // per internal user (20% off)
  targetAudience: string;
  features: PlanFeatures;
  featureList: string[]; // For display
  limitations?: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free Trial',
    description: 'Try before you buy',
    monthlyPrice: 0,
    annualPrice: 0,
    targetAudience: 'Evaluation only',
    features: {
      maxInternalUsers: 2,
      maxProjects: 3,
      deliveries: true,
      orders: true,
      projects: true,
      basicPayments: true,
      quickbooksInvoicesOnly: false,
      offlinePwa: false,
      whatsappAlerts: false,
      unlimitedExternalUsers: false,
      advancedReports: false,
      customFields: false,
      csvPdfExport: false,
      fullQuickbooksSync: false,
      inAppChat: false,
      emailSmsNotifications: false,
      prioritySupport: false,
      multiCompany: false,
      dedicatedOnboarding: false,
      customApi: false,
      whiteLabel: false,
      phoneSupport: false,
      soc2Compliance: false,
      onPremise: false,
    },
    featureList: [
      'Up to 2 users & 3 projects',
      'Basic deliveries, orders, projects',
      '14-day trial period',
    ],
    limitations: [
      'No accounting sync',
      'No offline mode',
      'Limited features',
    ],
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for solo builders or small teams (1-5 internal users)',
    monthlyPrice: 49,
    annualPrice: 39, // $468/year
    targetAudience: 'Solo builders or very small teams (1-5 internal users) testing the platform',
    features: {
      maxInternalUsers: 5,
      maxProjects: 10,
      deliveries: true,
      orders: true,
      projects: true,
      basicPayments: true,
      quickbooksInvoicesOnly: true,
      offlinePwa: true,
      whatsappAlerts: true,
      unlimitedExternalUsers: true,
      advancedReports: false,
      customFields: false,
      csvPdfExport: false,
      fullQuickbooksSync: false,
      inAppChat: false,
      emailSmsNotifications: false,
      prioritySupport: false,
      multiCompany: false,
      dedicatedOnboarding: false,
      customApi: false,
      whiteLabel: false,
      phoneSupport: false,
      soc2Compliance: false,
      onPremise: false,
    },
    featureList: [
      'Up to 5 internal users & 10 active projects',
      'Core modules: deliveries, orders, projects, basic payments',
      'QuickBooks/Xero sync (invoices only)',
      'Offline PWA & WhatsApp alerts',
      'Unlimited free external users (suppliers & clients)',
      'Email support (24-48 hours)',
    ],
    limitations: [
      'No expense sync to accounting',
      'No advanced reports or custom fields',
      'No in-app chat',
    ],
  },
  
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams that need real collaboration and deeper insights',
    monthlyPrice: 99,
    annualPrice: 79, // $948/year
    targetAudience: 'Growing teams (6-30 internal users) that need real collaboration and deeper insights',
    features: {
      maxInternalUsers: -1, // Unlimited
      maxProjects: -1, // Unlimited
      deliveries: true,
      orders: true,
      projects: true,
      basicPayments: true,
      quickbooksInvoicesOnly: true,
      offlinePwa: true,
      whatsappAlerts: true,
      unlimitedExternalUsers: true,
      advancedReports: true,
      customFields: true,
      csvPdfExport: true,
      fullQuickbooksSync: true, // Expenses, change orders, payments
      inAppChat: true,
      emailSmsNotifications: true,
      prioritySupport: true,
      multiCompany: false,
      dedicatedOnboarding: false,
      customApi: false,
      whiteLabel: false,
      phoneSupport: false,
      soc2Compliance: false,
      onPremise: false,
    },
    featureList: [
      'Unlimited users & projects',
      'Everything in Starter',
      'Advanced reports/analytics/custom fields',
      'Full QuickBooks/Xero sync (expenses, change orders, payments)',
      'In-app DM/chat per project',
      'Email/SMS notifications for critical events',
      'Priority Slack/email support',
      'CSV/PDF export with charts',
    ],
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large firms needing white-label, compliance, or on-premise options',
    monthlyPrice: 149, // Starting price, custom quote
    annualPrice: 99, // Custom discount
    targetAudience: 'Large firms (30+ internal users), banks, developers, or anyone needing white-label or on-premise',
    features: {
      maxInternalUsers: -1,
      maxProjects: -1,
      deliveries: true,
      orders: true,
      projects: true,
      basicPayments: true,
      quickbooksInvoicesOnly: true,
      offlinePwa: true,
      whatsappAlerts: true,
      unlimitedExternalUsers: true,
      advancedReports: true,
      customFields: true,
      csvPdfExport: true,
      fullQuickbooksSync: true,
      inAppChat: true,
      emailSmsNotifications: true,
      prioritySupport: true,
      multiCompany: true,
      dedicatedOnboarding: true,
      customApi: true,
      whiteLabel: true,
      phoneSupport: true,
      soc2Compliance: true,
      onPremise: true,
    },
    featureList: [
      'Everything in Pro',
      'Unlimited scale/multi-company',
      'Dedicated onboarding & training (video calls + custom guides)',
      'Custom API/integrations (50+ endpoints)',
      'White-label (your logo, colors, domain)',
      '24/7 phone support',
      'SOC 2 compliance / SLAs / on-premise option',
    ],
  },
};

/**
 * Check if a feature is available for a given plan
 */
export function hasFeature(planId: PlanId, feature: keyof PlanFeatures): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  return !!plan.features[feature];
}

/**
 * Check if user count is within plan limits
 */
export function canAddUser(planId: PlanId, currentUserCount: number): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  if (plan.features.maxInternalUsers === -1) return true;
  return currentUserCount < plan.features.maxInternalUsers;
}

/**
 * Check if project count is within plan limits
 */
export function canAddProject(planId: PlanId, currentProjectCount: number): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  if (plan.features.maxProjects === -1) return true;
  return currentProjectCount < plan.features.maxProjects;
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(feature: keyof PlanFeatures): string {
  const messages: Partial<Record<keyof PlanFeatures, string>> = {
    advancedReports: 'Upgrade to Pro for advanced reports and analytics',
    customFields: 'Upgrade to Pro for custom fields',
    fullQuickbooksSync: 'Upgrade to Pro for full QuickBooks/Xero sync including expenses',
    inAppChat: 'Upgrade to Pro for in-app messaging',
    emailSmsNotifications: 'Upgrade to Pro for email/SMS notifications',
    multiCompany: 'Upgrade to Enterprise for multi-company support',
    whiteLabel: 'Upgrade to Enterprise for white-label branding',
    customApi: 'Upgrade to Enterprise for custom API access',
  };
  return messages[feature] || 'Upgrade your plan to access this feature';
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(feature: keyof PlanFeatures): PlanId {
  if (PLANS.starter.features[feature]) return 'starter';
  if (PLANS.pro.features[feature]) return 'pro';
  if (PLANS.enterprise.features[feature]) return 'enterprise';
  return 'enterprise';
}
