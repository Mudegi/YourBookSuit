/**
 * System Admin API — Users Management
 * GET   /api/system-admin/users           — list all platform users
 * PATCH /api/system-admin/users           — activate/deactivate/promote user
 * DELETE /api/system-admin/users?id=...   — permanently delete a user
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
    const search = searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        isSystemAdmin: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                subscriptionStatus: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('System admin users list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin();
    if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'Missing userId or action' }, { status: 400 });
    }

    // Prevent modifying yourself
    if (userId === admin.id && (action === 'DEACTIVATE' || action === 'DELETE')) {
      return NextResponse.json({ success: false, error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'ACTIVATE':
        updateData = { isActive: true };
        break;
      case 'DEACTIVATE':
        updateData = { isActive: false };
        break;
      case 'GRANT_ADMIN':
        updateData = { isSystemAdmin: true };
        break;
      case 'REVOKE_ADMIN':
        if (userId === admin.id) {
          return NextResponse.json({ success: false, error: 'Cannot revoke your own admin privileges' }, { status: 400 });
        }
        updateData = { isSystemAdmin: false };
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        isActive: updated.isActive,
        isSystemAdmin: updated.isSystemAdmin,
      },
      message: `User ${action.toLowerCase().replace('_', ' ')}d successfully`,
    });
  } catch (error: any) {
    console.error('System admin user update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireSystemAdmin();
    if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }

    if (userId === admin.id) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Delete user (OrganizationUser cascade will handle membership cleanup)
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: `User "${user.email}" deleted permanently` });
  } catch (error: any) {
    console.error('System admin user delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
