import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgMembership = await requireOrgMembership(user.id, params.orgSlug);
    
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const managerId = searchParams.get('managerId');

    // Build filter
    const where: any = { organizationId: org.id };
    if (status) where.status = status;
    if (managerId) where.managerId = managerId;

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, companyName: true } },
        _count: {
          select: { tasks: true, costs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgMembership = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(orgMembership.role, 'manage:projects');

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      startDate,
      endDate,
      budget,
      currency = org.baseCurrency || 'USD',
      managerId,
      customerId,
    } = body;

    if (!code || !name || !startDate) {
      return NextResponse.json(
        { error: 'code, name, and startDate are required' },
        { status: 400 }
      );
    }

    // Verify uniqueness of code within org
    const existing = await prisma.project.findFirst({
      where: {
        organizationId: org.id,
        code,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Project code already exists' },
        { status: 409 }
      );
    }

    // Verify manager and customer if provided
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });
      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        );
      }
    }

    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || customer.organizationId !== org.id) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        code,
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        currency,
        managerId,
        customerId,
        status: 'ACTIVE',
      },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, companyName: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'PROJECT',
        entityId: project.id,
        changes: {
          code,
          name,
          budget,
        },
      },
    });

    return NextResponse.json(
      { ok: true, project },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
