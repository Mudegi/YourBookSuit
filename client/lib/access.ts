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
  userId: string,
  orgSlug: string
): Promise<{ org: any; membership: any }> {
  const prisma = (await import('./prisma')).default;
  
  console.log('🔍 requireOrgMembership called with:', { userId, orgSlug });
  
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  console.log('🏢 Organization found:', org ? `${org.name} (${org.id})` : 'NOT FOUND');
  
  if (!org) throw new Error('Organization not found');

  const membership = await prisma.organizationUser.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });
  
  console.log('👥 Membership found:', membership ? `Role: ${membership.role}` : 'NOT FOUND');
  
  if (!membership) throw new Error('User not in organization');
  
  return { org, membership };
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

/**
 * Ensure user has permission (alias for requirePermission)
 */
export function ensurePermission(
  userRole: Role,
  action: 'create' | 'read' | 'update' | 'delete'
): void {
  requirePermission(userRole, action);
}
