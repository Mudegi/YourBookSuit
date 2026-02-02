import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function hashCredential(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// GET /api/[orgSlug]/integrations/[id] - Get a specific integration
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fetch integration
    const integration = await prisma.integration.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        webhooks: true,
        syncLogs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
        _count: {
          select: {
            webhooks: true,
            syncLogs: true,
          },
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Remove sensitive fields
    const { apiKey, apiSecret, webhookSecret, ...sanitizedIntegration } = integration;

    return NextResponse.json(sanitizedIntegration);
  } catch (error) {
    console.error('Error fetching integration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}

// PATCH /api/[orgSlug]/integrations/[id] - Update an integration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;
    const body = await request.json();

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if integration exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.apiKey !== undefined) updateData.apiKey = hashCredential(body.apiKey);
    if (body.apiSecret !== undefined) updateData.apiSecret = hashCredential(body.apiSecret);
    if (body.webhookUrl !== undefined) updateData.webhookUrl = body.webhookUrl;
    if (body.webhookSecret !== undefined) updateData.webhookSecret = hashCredential(body.webhookSecret);
    if (body.config !== undefined) updateData.config = body.config;
    if (body.syncFrequency !== undefined) updateData.syncFrequency = body.syncFrequency;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    // Reset error count if status is being changed to ACTIVE
    if (body.status === 'ACTIVE') {
      updateData.errorCount = 0;
      updateData.lastError = null;
    }

    const integration = await prisma.integration.update({
      where: { id },
      data: updateData,
    });

    // Remove sensitive fields
    const { apiKey, apiSecret, webhookSecret, ...sanitizedIntegration } = integration;

    return NextResponse.json(sanitizedIntegration);
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// DELETE /api/[orgSlug]/integrations/[id] - Delete an integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if integration exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Delete associated webhooks and logs (cascade)
    await prisma.integration.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Integration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
