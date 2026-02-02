/**
 * API: CAPA Tasks Management
 * POST /api/[orgSlug]/quality/capa/tasks - Create CAPA task
 * GET /api/[orgSlug]/quality/capa/tasks - List CAPA tasks (with filters)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { capaService } from '@/services/capa.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_CAPA)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      capaId,
      title,
      description,
      assignedToId,
      dueDate,
      taskType,
    } = body;

    // Validate required fields
    if (!capaId || !title || !assignedToId || !taskType) {
      return NextResponse.json(
        { error: 'Missing required fields: capaId, title, assignedToId, taskType' },
        { status: 400 }
      );
    }

    // Verify CAPA belongs to organization
    const capa = await prisma.cAPA.findFirst({
      where: { id: capaId, organizationId: organization.id },
    });

    if (!capa) {
      return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
    }

    // Create task using service
    const task = await capaService.createCAPATask(capaId, organization.id, {
      title,
      description,
      assignedToId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      taskType,
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Error creating CAPA task:', error);
    return NextResponse.json(
      { error: 'Failed to create CAPA task', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.VIEW_CAPA)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const capaId = searchParams.get('capaId');
    const assignedToId = searchParams.get('assignedToId');
    const status = searchParams.get('status') as any;

    // Build filter
    const where: any = { organizationId: organization.id };
    if (capaId) where.capaId = capaId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;

    const tasks = await prisma.capaTask.findMany({
      where,
      include: {
        capa: {
          select: { id: true, capaNumber: true, title: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('Error fetching CAPA tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAPA tasks', details: error.message },
      { status: 500 }
    );
  }
}