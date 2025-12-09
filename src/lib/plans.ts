/**
 * SiteProc Pricing Plans - December 2025 (FINAL VERSION)
 * 
 * This file defines all plan features, limits, and pricing.
 * Used for both display and feature gating.
 * 
 * PRICING MODEL:
 * - All plans are PER INTERNAL USER (owner, admin, manager, accountant, editor, member)
 * - External users (client, supplier, contractor, consultant, subcontractor) are ALWAYS FREE
 * - Enterprise has volume discounts based on user count
 * 
 * PLAN SUMMARY:
 * - Starter ($49/user): 5 users, 10 projects, core modules, Zoho invoices only, email alerts
 * - Pro ($99/user): Unlimited, advanced reports, custom fields, chat, full Zoho sync, PDF export
 * - Enterprise ($149+/user): White-label, custom API, 24/7 phone, SOC 2, on-premise
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

// Internal roles that count toward billing (PAID)
export const BILLABLE_ROLES = ['owner', 'admin', 'manager', 'accountant', 'editor', 'member'];

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
  
  // Core features (all plans including Starter)
  projects: boolean;
  orders: boolean;
  deliveries: boolean;
  expenses: boolean;
  payments: boolean;
  
  // Starter features
  zohoInvoicesOnly: boolean;       // Zoho Books sync (invoices only)
  offlineMobileApp: boolean;       // Offline mobile app (works with no signal)
  emailAlerts: boolean;            // Email alerts
  unlimitedExternalUsers: boolean; // Unlimited free suppliers & clients
  emailSupport: boolean;           // Email support (24-48 hours)
  
  // Pro features (everything in Starter plus:)
  advancedReports: boolean;        // Advanced reports & analytics with charts
  customFields: boolean;           // Custom fields
  inAppChat: boolean;              // In-app chat/DM per project
  smsNotifications: boolean;       // Email + SMS notifications (SMS part)
  prioritySupport: boolean;        // Priority Slack/email support
  csvPdfExport: boolean;           // CSV & PDF export with logo
  fullZohoSync: boolean;           // Full Zoho Books sync (invoices + expenses + change orders + payments)
  
  // Enterprise features (everything in Pro plus:)
  whiteLabel: boolean;             // White-label (logo, name, colors)
  customDomain: boolean;           // Custom domain option
  dedicatedOnboarding: boolean;    // Dedicated onboarding & training
  customApi: boolean;              // Custom API & integrations (50+ endpoints)
  phoneSupport: boolean;           // 24/7 phone support
  soc2Compliance: boolean;         // SOC 2 / SLAs / on-premise option
  multiCompany: boolean;           // Multi-company support
  onPremise: boolean;              // On-premise deployment option
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
    description: 'Try before you buy - 14 days',
    monthlyPrice: 0,
    annualPrice: 0,
    targetAudience: 'Evaluation only',
    features: {
      maxInternalUsers: 2,
      maxProjects: 3,
      // Core features - limited
      projects: true,
      orders: true,
      deliveries: true,
      expenses: true,
      payments: true,
      // Starter features - disabled
      zohoInvoicesOnly: false,
      offlineMobileApp: false,
      emailAlerts: false,
      unlimitedExternalUsers: false,
      emailSupport: false,
      // Pro features - disabled
      advancedReports: false,
      customFields: false,
      inAppChat: false,
      smsNotifications: false,
      prioritySupport: false,
      csvPdfExport: false,
      fullZohoSync: false,
      // Enterprise features - disabled
      whiteLabel: false,
      customDomain: false,
      dedicatedOnboarding: false,
      customApi: false,
      phoneSupport: false,
      soc2Compliance: false,
      multiCompany: false,
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
    description: 'Solo builders or small teams (1–5 users)',
    monthlyPrice: 49,
    annualPrice: 39,
    targetAudience: 'Solo builders or small teams (1–5 users)',
    features: {
      maxInternalUsers: 5,
      maxProjects: 10,
      // Core features - enabled
      projects: true,
      orders: true,
      deliveries: true,
      expenses: true,
      payments: true,
      // Starter features - enabled
      zohoInvoicesOnly: true,
      offlineMobileApp: true,
      emailAlerts: true,
      unlimitedExternalUsers: true,
      emailSupport: true,
      // Pro features - DISABLED
      advancedReports: false,
      customFields: false,
      inAppChat: false,
      smsNotifications: false,
      prioritySupport: false,
      csvPdfExport: false,
      fullZohoSync: false,
      // Enterprise features - DISABLED
      whiteLabel: false,
      customDomain: false,
      dedicatedOnboarding: false,
      customApi: false,
      phoneSupport: false,
      soc2Compliance: false,
      multiCompany: false,
      onPremise: false,
    },
    featureList: [
      'Up to 5 internal users & 10 active projects',
      'Core modules: Projects, Orders, Deliveries, Expenses, Payments',
      'Zoho Books sync (invoices only)',
      'Offline mobile app (works with no signal)',
      'Email alerts',
      'Unlimited free suppliers & clients',
      'Email support (24–48 hours)',
    ],
    limitations: [
      'No advanced reports or custom fields',
      'No in-app chat or SMS alerts',
      'No full Zoho sync (expenses/change orders/payments)',
      'No PDF/CSV export with logo',
    ],
  },
  
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Growing teams (6–30 users)',
    monthlyPrice: 99,
    annualPrice: 79,
    targetAudience: 'Growing teams (6–30 users)',
    features: {
      maxInternalUsers: -1, // Unlimited
      maxProjects: -1, // Unlimited
      // Core features - enabled
      projects: true,
      orders: true,
      deliveries: true,
      expenses: true,
      payments: true,
      // Starter features - enabled
      zohoInvoicesOnly: true,
      offlineMobileApp: true,
      emailAlerts: true,
      unlimitedExternalUsers: true,
      emailSupport: true,
      // Pro features - ENABLED
      advancedReports: true,
      customFields: true,
      inAppChat: true,
      smsNotifications: true,
      prioritySupport: true,
      csvPdfExport: true,
      fullZohoSync: true,
      // Enterprise features - DISABLED
      whiteLabel: false,
      customDomain: false,
      dedicatedOnboarding: false,
      customApi: false,
      phoneSupport: false,
      soc2Compliance: false,
      multiCompany: false,
      onPremise: false,
    },
    featureList: [
      'Unlimited internal users & unlimited projects',
      'Everything in Starter',
      'Full Zoho Books sync (invoices + expenses + change orders + payments)',
      'Advanced reports & analytics with charts',
      'Custom fields',
      'In-app chat/DM per project',
      'Email + SMS notifications',
      'Priority Slack/email support',
      'CSV & PDF export with your logo',
    ],
    limitations: [
      'No white-label or custom domain',
      'No dedicated onboarding',
      'No custom API access',
      'No 24/7 phone support',
    ],
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Large firms (30+ users) - Custom quote',
    monthlyPrice: 149,
    annualPrice: 99,
    targetAudience: 'Large firms (30+ users)',
    features: {
      maxInternalUsers: -1, // Unlimited
      maxProjects: -1, // Unlimited
      // Core features - enabled
      projects: true,
      orders: true,
      deliveries: true,
      expenses: true,
      payments: true,
      // Starter features - enabled
      zohoInvoicesOnly: true,
      offlineMobileApp: true,
      emailAlerts: true,
      unlimitedExternalUsers: true,
      emailSupport: true,
      // Pro features - enabled
      advancedReports: true,
      customFields: true,
      inAppChat: true,
      smsNotifications: true,
      prioritySupport: true,
      csvPdfExport: true,
      fullZohoSync: true,
      // Enterprise features - ENABLED
      whiteLabel: true,
      customDomain: true,
      dedicatedOnboarding: true,
      customApi: true,
      phoneSupport: true,
      soc2Compliance: true,
      multiCompany: true,
      onPremise: true,
    },
    featureList: [
      'Unlimited internal users & unlimited projects',
      'Everything in Pro',
      'Unlimited scale & multi-company support',
      'Dedicated onboarding & training',
      'Custom API & integrations (50+ endpoints)',
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
    // Pro features
    advancedReports: 'Upgrade to Pro for advanced reports and analytics with charts',
    customFields: 'Upgrade to Pro for custom fields',
    fullZohoSync: 'Upgrade to Pro for full Zoho Books sync (expenses, change orders, payments)',
    inAppChat: 'Upgrade to Pro for in-app chat/DM per project',
    smsNotifications: 'Upgrade to Pro for SMS notifications',
    csvPdfExport: 'Upgrade to Pro for CSV & PDF export with your logo',
    prioritySupport: 'Upgrade to Pro for priority Slack/email support',
    // Enterprise features
    whiteLabel: 'Upgrade to Enterprise for white-label branding (your logo, colors, domain)',
    customDomain: 'Upgrade to Enterprise for custom domain',
    dedicatedOnboarding: 'Upgrade to Enterprise for dedicated onboarding & training',
    customApi: 'Upgrade to Enterprise for custom API access (50+ endpoints)',
    phoneSupport: 'Upgrade to Enterprise for 24/7 phone support',
    soc2Compliance: 'Upgrade to Enterprise for SOC 2 compliance / SLAs',
    multiCompany: 'Upgrade to Enterprise for multi-company support',
    onPremise: 'Upgrade to Enterprise for on-premise deployment',
  };
  return messages[feature] || 'Upgrade your plan to access this feature';
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(feature: keyof PlanFeatures): PlanId {
  // Check if Starter has it
  if (PLANS.starter.features[feature]) return 'starter';
  // Check if Pro has it
  if (PLANS.pro.features[feature]) return 'pro';
  // Must be Enterprise
  return 'enterprise';
}

/**
 * Check if plan can add more internal users
 */
export function getRemainingUserSlots(planId: PlanId, currentUserCount: number): number {
  const plan = PLANS[planId];
  if (!plan) return 0;
  if (plan.features.maxInternalUsers === -1) return Infinity;
  return Math.max(0, plan.features.maxInternalUsers - currentUserCount);
}

/**
 * Check if plan can add more projects
 */
export function getRemainingProjectSlots(planId: PlanId, currentProjectCount: number): number {
  const plan = PLANS[planId];
  if (!plan) return 0;
  if (plan.features.maxProjects === -1) return Infinity;
  return Math.max(0, plan.features.maxProjects - currentProjectCount);
}

/**
 * Get user limit message for display
 */
export function getUserLimitBanner(planId: PlanId, currentUserCount: number): { show: boolean; message: string; type: 'warning' | 'error' } | null {
  const plan = PLANS[planId];
  if (!plan || plan.features.maxInternalUsers === -1) return null;
  
  const remaining = plan.features.maxInternalUsers - currentUserCount;
  
  if (remaining <= 0) {
    return {
      show: true,
      message: `You've reached the ${plan.features.maxInternalUsers} user limit on ${plan.name}. Upgrade to Pro for unlimited users.`,
      type: 'error'
    };
  }
  
  if (remaining === 1) {
    return {
      show: true,
      message: `You have 1 user slot remaining. Upgrade to Pro for unlimited users.`,
      type: 'warning'
    };
  }
  
  return null;
}

/**
 * Get project limit message for display
 */
export function getProjectLimitBanner(planId: PlanId, currentProjectCount: number): { show: boolean; message: string; type: 'warning' | 'error' } | null {
  const plan = PLANS[planId];
  if (!plan || plan.features.maxProjects === -1) return null;
  
  const remaining = plan.features.maxProjects - currentProjectCount;
  
  if (remaining <= 0) {
    return {
      show: true,
      message: `You've reached the ${plan.features.maxProjects} active project limit on ${plan.name}. Upgrade to Pro for unlimited projects.`,
      type: 'error'
    };
  }
  
  if (remaining <= 2) {
    return {
      show: true,
      message: `You have ${remaining} project slot${remaining === 1 ? '' : 's'} remaining. Upgrade to Pro for unlimited projects.`,
      type: 'warning'
    };
  }
  
  return null;
}
