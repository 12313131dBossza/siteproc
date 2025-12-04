/**
 * Role-Based Permission System for SiteProc
 * 
 * Role Hierarchy (lowest to highest):
 * 1. Viewer - Read-only access
 * 2. Editor - Basic editing (create/edit, no delete)
 * 3. Accountant - Financial management
 * 4. Manager - Operational tasks
 * 5. Admin - Manage operations
 * 6. Owner - Full access
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'accountant' | 'editor' | 'viewer';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'viewer': 1,
  'editor': 2,
  'accountant': 3,
  'manager': 4,
  'admin': 5,
  'owner': 6
};

export const ROLE_LABELS: Record<UserRole, string> = {
  'viewer': 'Viewer',
  'editor': 'Editor',
  'accountant': 'Accountant',
  'manager': 'Manager',
  'admin': 'Admin',
  'owner': 'Owner'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'viewer': 'Read-only access',
  'editor': 'Basic editing (create/edit)',
  'accountant': 'Financial management',
  'manager': 'Operational tasks',
  'admin': 'Manage operations',
  'owner': 'Full access'
};

/**
 * Detailed Permission definitions by category
 * Based on the official role matrix
 */
export const PERMISSIONS = {
  // ===================
  // VIEW PERMISSIONS (Viewer+)
  // ===================
  'view:projects': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:orders': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:deliveries': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:expenses': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:payments': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:reports': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:documents': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:photos': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:timeline': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:messages': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:contractors': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:clients': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:products': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:bids': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'view:change-orders': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],
  'download:documents': ['viewer', 'editor', 'accountant', 'manager', 'admin', 'owner'],

  // ===================
  // EDITOR PERMISSIONS (Editor+) - Create/Edit but no Delete
  // ===================
  'create:orders': ['editor', 'manager', 'admin', 'owner'],
  'edit:orders': ['editor', 'manager', 'admin', 'owner'],
  'create:deliveries': ['editor', 'manager', 'admin', 'owner'],
  'edit:deliveries': ['editor', 'manager', 'admin', 'owner'],
  'complete:deliveries': ['editor', 'manager', 'admin', 'owner'],
  'upload:documents': ['editor', 'manager', 'admin', 'owner'],
  'upload:photos': ['editor', 'manager', 'admin', 'owner'],
  'send:messages': ['editor', 'manager', 'admin', 'owner'],

  // ===================
  // FINANCIAL PERMISSIONS (Accountant+)
  // ===================
  'create:expenses': ['accountant', 'manager', 'admin', 'owner'],
  'edit:expenses': ['accountant', 'manager', 'admin', 'owner'],
  'delete:expenses': ['accountant', 'manager', 'admin', 'owner'],
  'create:payments': ['accountant', 'manager', 'admin', 'owner'],
  'edit:payments': ['accountant', 'manager', 'admin', 'owner'],
  'approve:payments': ['accountant', 'manager', 'admin', 'owner'],
  'reject:payments': ['accountant', 'manager', 'admin', 'owner'],
  'run:financial-reports': ['accountant', 'manager', 'admin', 'owner'],
  'sync:quickbooks': ['accountant', 'manager', 'admin', 'owner'],
  'create:invoices': ['accountant', 'manager', 'admin', 'owner'],
  'edit:invoices': ['accountant', 'manager', 'admin', 'owner'],

  // ===================
  // OPERATIONAL PERMISSIONS (Manager+)
  // ===================
  'create:projects': ['manager', 'admin', 'owner'],
  'edit:projects': ['manager', 'admin', 'owner'],
  'create:milestones': ['manager', 'admin', 'owner'],
  'edit:milestones': ['manager', 'admin', 'owner'],
  'delete:milestones': ['manager', 'admin', 'owner'],
  'complete:milestones': ['manager', 'admin', 'owner'],
  'delete:orders': ['manager', 'admin', 'owner'],
  'assign:deliveries': ['manager', 'admin', 'owner'],
  'create:bids': ['manager', 'admin', 'owner'],
  'edit:bids': ['manager', 'admin', 'owner'],
  'delete:bids': ['manager', 'admin', 'owner'],
  'create:change-orders': ['manager', 'admin', 'owner'],
  'edit:change-orders': ['manager', 'admin', 'owner'],
  'approve:change-orders': ['manager', 'admin', 'owner'],
  'invite:suppliers': ['manager', 'admin', 'owner'],
  'invite:clients': ['manager', 'admin', 'owner'],
  'create:contractors': ['manager', 'admin', 'owner'],
  'edit:contractors': ['manager', 'admin', 'owner'],
  'create:clients': ['manager', 'admin', 'owner'],
  'edit:clients': ['manager', 'admin', 'owner'],
  'create:products': ['manager', 'admin', 'owner'],
  'edit:products': ['manager', 'admin', 'owner'],
  'share:project-access': ['manager', 'admin', 'owner'],

  // ===================
  // ADMIN PERMISSIONS (Admin+)
  // ===================
  'invite:team-members': ['admin', 'owner'],
  'remove:team-members': ['admin', 'owner'],
  'change:user-roles': ['admin', 'owner'],
  'delete:projects': ['admin', 'owner'],
  'archive:projects': ['admin', 'owner'],
  'delete:contractors': ['admin', 'owner'],
  'delete:clients': ['admin', 'owner'],
  'delete:products': ['admin', 'owner'],
  'delete:documents': ['admin', 'owner'],
  'delete:photos': ['admin', 'owner'],
  'delete:change-orders': ['admin', 'owner'],
  'delete:deliveries': ['admin', 'owner'],
  'delete:payments': ['admin', 'owner'],
  'access:settings': ['admin', 'owner'],
  'manage:notifications': ['admin', 'owner'],
  'manage:quickbooks': ['admin', 'owner'],
  'manage:branding': ['admin', 'owner'],

  // ===================
  // OWNER PERMISSIONS (Owner only)
  // ===================
  'change:billing': ['owner'],
  'change:subscription': ['owner'],
  'delete:company': ['owner'],
  'transfer:ownership': ['owner'],
  'assign:owner-role': ['owner'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles?.includes(role as UserRole) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole | string | null | undefined, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole | string | null | undefined, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get the role level for comparison
 */
export function getRoleLevel(role: UserRole | string | null | undefined): number {
  if (!role) return 0;
  return ROLE_HIERARCHY[role as UserRole] || 0;
}

/**
 * Check if a role is at least a certain level
 */
export function isRoleAtLeast(currentRole: UserRole | string | null | undefined, requiredRole: UserRole): boolean {
  return getRoleLevel(currentRole) >= getRoleLevel(requiredRole);
}

/**
 * Check if the current user's role can manage the target role
 * Users can only manage roles below their level (except owner can manage anyone)
 */
export function canManageRole(currentRole: UserRole | string | null | undefined, targetRole: UserRole | string | null | undefined): boolean {
  if (!currentRole) return false;
  if (currentRole === 'owner') return true;
  
  const currentLevel = getRoleLevel(currentRole);
  const targetLevel = getRoleLevel(targetRole);
  
  return currentLevel > targetLevel;
}

/**
 * Get roles that the current user can assign to others
 */
export function getAssignableRoles(currentRole: UserRole | string | null | undefined): UserRole[] {
  if (!currentRole) return [];
  
  const currentLevel = getRoleLevel(currentRole);
  
  // Owner can assign any role
  if (currentRole === 'owner') {
    return ['viewer', 'accountant', 'manager', 'admin', 'owner'];
  }
  
  // Others can only assign roles below their level
  return (Object.entries(ROLE_HIERARCHY) as [UserRole, number][])
    .filter(([, level]) => level < currentLevel)
    .map(([role]) => role);
}

/**
 * Check if current user can edit a specific user
 */
export function canEditUser(currentRole: UserRole | string | null | undefined, targetRole: UserRole | string | null | undefined): boolean {
  if (!currentRole) return false;
  if (!hasPermission(currentRole, 'change:user-roles')) return false;
  return canManageRole(currentRole, targetRole);
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: UserRole | string | null | undefined): string {
  if (!role) return 'Unknown';
  return ROLE_LABELS[role as UserRole] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole | string | null | undefined): string {
  if (!role) return '';
  return ROLE_DESCRIPTIONS[role as UserRole] || '';
}

/**
 * Require permission - throws error if permission is not granted
 * Useful for API route protection
 */
export function requirePermission(
  role: UserRole | string | null | undefined,
  permission: Permission
): void {
  if (!role) {
    throw new Error('Authentication required');
  }
  
  if (!hasPermission(role, permission)) {
    throw new Error(`Insufficient permissions: requires ${permission}`);
  }
}

/**
 * Permission descriptions for UI
 */
export const ROLE_PERMISSIONS_SUMMARY: Record<UserRole, { canDo: string[]; cannotDo: string[] }> = {
  viewer: {
    canDo: [
      'View all projects, deliveries, orders, expenses, photos, timeline, reports',
      'Open PDFs and download them',
      'Read all messages (company-side threads)',
    ],
    cannotDo: [
      'Cannot edit or create anything',
      'Cannot invite anyone',
      'Cannot approve payments or change statuses',
    ],
  },
  accountant: {
    canDo: [
      'Everything Viewer can do PLUS:',
      'Full access to Expenses, Payments, QuickBooks sync',
      'Create/edit expenses and invoices',
      'Approve or reject payments',
      'Run financial reports',
    ],
    cannotDo: [
      'Cannot create or delete projects',
      'Cannot invite suppliers/clients',
      'Cannot change project settings or milestones',
    ],
  },
  manager: {
    canDo: [
      'Everything Accountant can do PLUS:',
      'Create/edit projects and milestones',
      'Place orders, assign deliveries to suppliers',
      'Mark deliveries complete (if no proof needed)',
      'Invite suppliers and clients',
      'Send messages/DMs',
    ],
    cannotDo: [
      'Cannot delete projects (only Owner/Admin)',
      'Cannot change billing or team roles',
      'Cannot access some Enterprise settings',
    ],
  },
  admin: {
    canDo: [
      'Everything Manager can do PLUS:',
      'Invite and remove team members',
      'Change any user\'s role (except Owner)',
      'Delete or archive projects',
      'Access all settings (notifications, QuickBooks, branding)',
    ],
    cannotDo: [
      'Cannot change billing / subscription (Owner only)',
      'Cannot delete the entire company account',
    ],
  },
  owner: {
    canDo: [
      'Literally everything:',
      'All above permissions',
      'Change subscription & billing',
      'Delete the entire company account',
      'Transfer ownership',
    ],
    cannotDo: [
      'Nothing is blocked – 100% control',
    ],
  },
};
