/**
 * System Admin API — Organizations Management
 * GET  /api/system-admin/organizations — list all orgs with subscription info
 * PATCH /api/system-admin/organizations — update subscription status
 * DELETE /api/system-admin/organizations — delete an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function requireSystemAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { id: true, isSystemAdmin: true },
  });
  if (!user?.isSystemAdmin) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin();
    if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filter by subscription status
    const search = searchParams.get('search');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.subscriptionStatus = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const organizations = await prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        isActive: true,
        baseCurrency: true,
        subscriptionStatus: true,
        trialStartDate: true,
        trialEndDate: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        approvedAt: true,
        suspendedReason: true,
        onboardingCompleted: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            invoices: true,
            transactions: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: organizations });
  } catch (error: any) {
    console.error('System admin orgs list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin();
    if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { organizationId, action, reason } = body;

    if (!organizationId || !action) {
      return NextResponse.json({ success: false, error: 'Missing organizationId or action' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'APPROVE':
        updateData = {
          subscriptionStatus: 'ACTIVE',
          approvedAt: new Date(),
          approvedById: admin.id,
          subscriptionStartDate: new Date(),
          isActive: true,
        };
        break;
      case 'SUSPEND':
        updateData = {
          subscriptionStatus: 'SUSPENDED',
          suspendedReason: reason || 'Suspended by system admin',
          isActive: false,
        };
        break;
      case 'REACTIVATE':
        updateData = {
          subscriptionStatus: 'ACTIVE',
          isActive: true,
          suspendedReason: null,
        };
        break;
      case 'CANCEL':
        updateData = {
          subscriptionStatus: 'CANCELLED',
          subscriptionEndDate: new Date(),
          isActive: false,
        };
        break;
      case 'EXTEND_TRIAL':
        // Extend trial by another 7 days from now
        const newEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        updateData = {
          subscriptionStatus: 'TRIAL',
          trialEndDate: newEnd,
          isActive: true,
        };
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated, message: `Organization ${action.toLowerCase()}d successfully` });
  } catch (error: any) {
    console.error('System admin org update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin();
    if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('id');

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Missing organization id' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Cascade delete handled by Prisma schema (onDelete: Cascade on OrganizationUser)
    await prisma.organization.delete({ where: { id: organizationId } });

    return NextResponse.json({ success: true, message: `Organization "${org.name}" deleted permanently` });
  } catch (error: any) {
    console.error('System admin org delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
