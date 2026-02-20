/**
 * System Admin API — Dashboard Stats
 * GET /api/system-admin
 * Requires isSystemAdmin on the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function requireSystemAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { id: true, isSystemAdmin: true },
  });
  if (!user?.isSystemAdmin) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Gather platform-wide stats
    const [
      totalUsers,
      totalOrgs,
      activeOrgs,
      trialOrgs,
      trialExpiredOrgs,
      pendingApprovalOrgs,
      suspendedOrgs,
      cancelledOrgs,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.organization.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'TRIAL' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'TRIAL_EXPIRED' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'PENDING_APPROVAL' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'SUSPENDED' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'CANCELLED' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isSystemAdmin: true,
          createdAt: true,
          organizations: {
            include: { organization: { select: { name: true, slug: true, subscriptionStatus: true } } },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalOrgs,
          activeOrgs,
          trialOrgs,
          trialExpiredOrgs,
          pendingApprovalOrgs,
          suspendedOrgs,
          cancelledOrgs,
        },
        recentUsers,
      },
    });
  } catch (error: any) {
    console.error('System admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
