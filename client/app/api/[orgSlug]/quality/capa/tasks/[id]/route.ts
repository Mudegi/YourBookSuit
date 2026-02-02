/**
 * API: Individual CAPA Task Management
 * PUT /api/[orgSlug]/quality/capa/tasks/[id] - Update CAPA task
 * DELETE /api/[orgSlug]/quality/capa/tasks/[id] - Delete CAPA task
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { capaService } from '@/services/capa.service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
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
    const { status, notes } = body;

    // Update task using service
    const task = await capaService.updateCAPATask(params.id, organization.id, {
      status,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Error updating CAPA task:', error);
    return NextResponse.json(
      { error: 'Failed to update CAPA task', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
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

    // Delete task (hard delete since tasks are implementation details)
    await prisma.capaTask.delete({
      where: { id: params.id, organizationId: organization.id },
    });

    return NextResponse.json({
      success: true,
      message: 'CAPA task deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting CAPA task:', error);
    return NextResponse.json(
      { error: 'Failed to delete CAPA task', details: error.message },
      { status: 500 }
    );
  }
}