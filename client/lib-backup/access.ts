/**
 * Access control and authorization utilities
 */

import { getCurrentUser } from './auth';

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

export interface OrganizationMembership {
  organizationId: string;
  userId: string;
  role: Role;
}

/**
 * Check if user is member of organization
 */
export async function requireOrgMembership(
  organizationSlug: string
): Promise<{ user: any; membership: any }> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  // In a real implementation, you would query the database
  // For now, we'll return a mock membership
  // This should be replaced with actual database query
  
  return {
    user,
    membership: {
      organizationId: organizationSlug,
      userId: user.id,
      role: 'OWNER' as Role,
    },
  };
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    VIEWER: 1,
    USER: 2,
    MANAGER: 3,
    ADMIN: 4,
    OWNER: 5,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Require specific role
 */
export function requireRole(userRole: Role, requiredRole: Role): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new Error('Insufficient permissions');
  }
}

/**
 * Check if user can perform action
 */
export function canPerformAction(
  userRole: Role,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const permissions: Record<Role, string[]> = {
    VIEWER: ['read'],
    USER: ['read', 'create'],
    MANAGER: ['read', 'create', 'update'],
    ADMIN: ['read', 'create', 'update', 'delete'],
    OWNER: ['read', 'create', 'update', 'delete'],
  };

  return permissions[userRole].includes(action);
}

/**
 * Require permission for action
 */
export function requirePermission(
  userRole: Role,
  action: 'create' | 'read' | 'update' | 'delete'
): void {
  if (!canPerformAction(userRole, action)) {
    throw new Error(`Permission denied: Cannot ${action}`);
  }
}
