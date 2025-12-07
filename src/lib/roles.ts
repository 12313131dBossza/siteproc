/**
 * Role-Based Access Control (RBAC) for SiteProc
 * 
 * This file defines all role permissions for the application.
 * Use this to check if a user can perform an action.
 */

// All available roles in the system
export const ALL_ROLES = [
  'owner',
  'admin', 
  'manager',
  'bookkeeper',
  'member',
  'client',
  'supplier',
  'contractor',
  'consultant',
  'subcontractor',
  'viewer'
] as const;

export type Role = typeof ALL_ROLES[number];

// Internal roles (company team members)
export const INTERNAL_ROLES: Role[] = ['owner', 'admin', 'manager', 'bookkeeper', 'member'];

// External roles (clients, vendors, etc.)
export const EXTERNAL_ROLES: Role[] = ['client', 'supplier', 'contractor', 'consultant', 'subcontractor', 'viewer'];

/**
 * Permission definitions
 * Each action maps to the roles that can perform it
 */
export const PERMISSIONS = {
  // Project management
  'project.create': ['owner', 'admin', 'manager'],
  'project.edit': ['owner', 'admin', 'manager', 'bookkeeper'],
  'project.delete': ['owner', 'admin'],
  'project.view': ALL_ROLES,
  
  // Milestone management
  'milestone.create': ['owner', 'admin', 'manager', 'bookkeeper', 'member'],
  'milestone.edit': ['owner', 'admin', 'manager', 'bookkeeper', 'member'],
  'milestone.delete': ['owner', 'admin', 'manager'],
  'milestone.view': ALL_ROLES,
  'milestone.complete': ['owner', 'admin', 'manager', 'bookkeeper', 'member'],
  
  // Order management
  'order.create': ['owner', 'admin', 'manager', 'bookkeeper', 'member'],
  'order.edit': ['owner', 'admin', 'manager', 'bookkeeper'],
  'order.delete': ['owner', 'admin'],
  'order.approve': ['owner', 'admin', 'manager'],
  'order.view': ['owner', 'admin', 'manager', 'bookkeeper', 'member', 'supplier', 'contractor'],
  
  // Expense management
  'expense.create': ['owner', 'admin', 'manager', 'bookkeeper', 'member'],
  'expense.edit': ['owner', 'admin', 'manager', 'bookkeeper'],
  'expense.delete': ['owner', 'admin'],
  'expense.approve': ['owner', 'admin', 'manager'],
  'expense.view': ['owner', 'admin', 'manager', 'bookkeeper'],
  
  // Delivery management
  'delivery.create': ['owner', 'admin', 'manager', 'bookkeeper', 'member', 'supplier'],
  'delivery.edit': ['owner', 'admin', 'manager', 'bookkeeper', 'member', 'supplier'],
  'delivery.delete': ['owner', 'admin'],
  'delivery.view': ['owner', 'admin', 'manager', 'bookkeeper', 'member', 'supplier', 'contractor', 'client'],
  
  // Payment management
  'payment.create': ['owner', 'admin', 'manager', 'bookkeeper'],
  'payment.edit': ['owner', 'admin', 'bookkeeper'],
  'payment.delete': ['owner', 'admin'],
  'payment.view': ['owner', 'admin', 'manager', 'bookkeeper'],
  
  // User management
  'user.invite': ['owner', 'admin'],
  'user.edit': ['owner', 'admin'],
  'user.delete': ['owner'],
  'user.view': ['owner', 'admin', 'manager'],
  
  // Company settings
  'company.edit': ['owner', 'admin'],
  'company.billing': ['owner', 'admin'],
  'company.integrations': ['owner', 'admin'],
  
  // Reports & Analytics
  'reports.view': ['owner', 'admin', 'manager', 'bookkeeper'],
  'reports.export': ['owner', 'admin', 'manager', 'bookkeeper'],
  
  // Documents
  'document.upload': ['owner', 'admin', 'manager', 'bookkeeper', 'member'],
  'document.delete': ['owner', 'admin', 'manager'],
  'document.view': ALL_ROLES,
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Check if a role can perform any of the given permissions
 */
export function hasAnyPermission(role: string | null | undefined, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role can perform all of the given permissions
 */
export function hasAllPermissions(role: string | null | undefined, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, readonly Role[]][])
    .filter(([_, roles]) => roles.includes(role as Role))
    .map(([permission]) => permission);
}

/**
 * Check if role is internal (company team member)
 */
export function isInternalRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return INTERNAL_ROLES.includes(role as Role);
}

/**
 * Check if role is external (client, supplier, etc.)
 */
export function isExternalRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return EXTERNAL_ROLES.includes(role as Role);
}

/**
 * Role hierarchy for comparison (higher = more permissions)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  'owner': 100,
  'admin': 90,
  'manager': 70,
  'bookkeeper': 60,
  'member': 50,
  'contractor': 30,
  'consultant': 30,
  'supplier': 25,
  'subcontractor': 25,
  'client': 20,
  'viewer': 10,
};

/**
 * Check if role1 has higher or equal authority than role2
 */
export function hasHigherOrEqualRole(role1: string | null | undefined, role2: string | null | undefined): boolean {
  const level1 = ROLE_HIERARCHY[role1 || ''] || 0;
  const level2 = ROLE_HIERARCHY[role2 || ''] || 0;
  return level1 >= level2;
}
