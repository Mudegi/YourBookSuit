/**
 * Branch Access Service
 *
 * Resolves which branches a given OrganizationUser is allowed to see.
 * - If `branchRestricted = false` on OrganizationUser  → all branches
 * - If `branchRestricted = true`                       → only branches in UserBranchAccess
 *
 * Usage in API routes:
 *   const allowed = await BranchAccessService.getAllowedBranchIds(orgId, userId);
 *   // pass `allowed` as a Prisma `WHERE branchId IN (...)` filter
 */

import prisma from '@/lib/prisma';

export class BranchAccessService {
  /**
   * Return `null` when the user can see all branches (no restriction).
   * Return a string[] when access is restricted to specific branch IDs.
   */
  static async getAllowedBranchIds(
    organizationId: string,
    userId: string,
  ): Promise<string[] | null> {
    const orgUser = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { branchAccess: { select: { branchId: true } } },
    });

    if (!orgUser) return []; // user not in org → no access
    if (!orgUser.branchRestricted) return null; // unrestricted → all branches
    return orgUser.branchAccess.map((a) => a.branchId);
  }

  /** Grant access to a specific branch for a user */
  static async grantAccess(
    organizationId: string,
    userId: string,
    branchId: string,
    grantedById?: string,
  ) {
    const orgUser = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!orgUser) throw new Error('User not in organization');

    return prisma.userBranchAccess.upsert({
      where: { organizationUserId_branchId: { organizationUserId: orgUser.id, branchId } },
      create: { organizationUserId: orgUser.id, branchId, grantedById },
      update: {},
    });
  }

  /** Revoke branch access */
  static async revokeAccess(organizationId: string, userId: string, branchId: string) {
    const orgUser = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!orgUser) throw new Error('User not in organization');

    await prisma.userBranchAccess.deleteMany({
      where: { organizationUserId: orgUser.id, branchId },
    });
  }

  /** Enable branch restriction for a user (admin action) */
  static async setRestricted(organizationId: string, userId: string, restricted: boolean) {
    await prisma.organizationUser.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: { branchRestricted: restricted },
    });
  }
}
