/**
 * Role-based permissions utility
 * Provides functions to check user permissions based on their role
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'accountant' | 'viewer';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type PermissionResource = 
  | 'users' 
  | 'company' 
  | 'orders' 
  | 'deliveries' 
  | 'products' 
  | 'projects' 
  | 'financials';

/**
 * Permission definitions for each role
 */
const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionResource, PermissionAction[]>> = {
  owner: {
    users: ['manage'],
    company: ['manage'],
    orders: ['manage'],
    deliveries: ['manage'],
    products: ['manage'],
    projects: ['manage'],
    financials: ['manage'],
  },
  admin: {
    users: ['create', 'read', 'update'],
    company: ['read'],
    orders: ['manage'],
    deliveries: ['manage'],
    products: ['manage'],
    projects: ['manage'],
    financials: ['read'],
  },
  manager: {
    users: ['read'],
    company: ['read'],
    orders: ['create', 'read', 'update'],
    deliveries: ['create', 'read', 'update'],
    products: ['read', 'update'],
    projects: ['read', 'update'],
    financials: ['read'],
  },
  accountant: {
    users: ['read'],
    company: ['read'],
    orders: ['read'],
    deliveries: ['read'],
    products: ['read'],
    projects: ['read'],
    financials: ['manage'],
  },
  viewer: {
    users: [],
    company: ['read'],
    orders: ['read'],
    deliveries: ['read'],
    products: ['read'],
    projects: ['read'],
    financials: [],
  },
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[resource] || [];
  
  // 'manage' includes all actions
  if (permissions.includes('manage')) {
    return true;
  }
  
  return permissions.includes(action);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  resource: PermissionResource,
  actions: PermissionAction[]
): boolean {
  return actions.some(action => hasPermission(role, resource, action));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  resource: PermissionResource,
  actions: PermissionAction[]
): boolean {
  return actions.every(action => hasPermission(role, resource, action));
}

/**
 * Get all permissions for a role and resource
 */
export function getPermissions(
  role: UserRole,
  resource: PermissionResource
): PermissionAction[] {
  const permissions = ROLE_PERMISSIONS[role]?.[resource] || [];
  
  // If 'manage' is present, expand to all actions
  if (permissions.includes('manage')) {
    return ['create', 'read', 'update', 'delete', 'manage'];
  }
  
  return permissions;
}

/**
 * Check if a role can manage a resource (full CRUD access)
 */
export function canManage(role: UserRole, resource: PermissionResource): boolean {
  return hasPermission(role, resource, 'manage');
}

/**
 * Role hierarchy helper - check if a role is at least a certain level
 */
export function isRoleAtLeast(currentRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: UserRole[] = ['viewer', 'accountant', 'manager', 'admin', 'owner'];
  const currentIndex = roleHierarchy.indexOf(currentRole);
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  
  return currentIndex >= requiredIndex;
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    manager: 'Manager',
    accountant: 'Accountant',
    viewer: 'Viewer',
  };
  
  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'Full system access and company ownership',
    admin: 'Manage operations and team members',
    manager: 'Manage projects, orders, and deliveries',
    accountant: 'Financial management and reporting',
    viewer: 'Read-only access to company data',
  };
  
  return descriptions[role] || '';
}

/**
 * Require permission - throws error if permission is not granted
 * Useful for API route protection
 */
export function requirePermission(
  role: UserRole | undefined,
  resource: PermissionResource,
  action: PermissionAction
): void {
  if (!role) {
    throw new Error('Authentication required');
  }
  
  if (!hasPermission(role, resource, action)) {
    throw new Error(`Insufficient permissions: requires ${action} access to ${resource}`);
  }
}

/**
 * Check if user can modify another user's role
 */
export function canModifyUserRole(
  currentUserRole: UserRole,
  targetUserRole: UserRole,
  newRole?: UserRole
): boolean {
  // Only owners can modify roles
  if (currentUserRole !== 'owner') {
    return false;
  }
  
  // Owners can modify anyone's role
  return true;
}

/**
 * Check if user can delete/remove another user
 */
export function canRemoveUser(
  currentUserRole: UserRole,
  targetUserRole: UserRole
): boolean {
  // Only owners can remove users
  if (currentUserRole !== 'owner') {
    return false;
  }
  
  // Owners can remove anyone
  return true;
}

/**
 * Get all available actions for a role on a resource
 * Useful for building UI with conditional rendering
 */
export function getAvailableActions(
  role: UserRole,
  resource: PermissionResource
): {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManage: boolean;
} {
  return {
    canCreate: hasPermission(role, resource, 'create'),
    canRead: hasPermission(role, resource, 'read'),
    canUpdate: hasPermission(role, resource, 'update'),
    canDelete: hasPermission(role, resource, 'delete'),
    canManage: hasPermission(role, resource, 'manage'),
  };
}

/**
 * Export permission definitions for reference
 */
export { ROLE_PERMISSIONS };
