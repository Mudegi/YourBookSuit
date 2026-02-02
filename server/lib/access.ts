import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function requireOrgMembership(userId: string, orgSlug: string) {
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new Error('Organization not found');

  const membership = await prisma.organizationUser.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });
  if (!membership) throw new Error('User not in organization');
  return { org, membership };
}
