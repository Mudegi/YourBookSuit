import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/[orgSlug]/api-keys/[id] - Revoke API key
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

    // Check if API key exists
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Soft delete - deactivate instead of delete
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}

// PATCH /api/[orgSlug]/api-keys/[id] - Update API key (name, permissions, rate limit)
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

    // Check if API key exists
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.permissions !== undefined) updateData.permissions = body.permissions;
    if (body.rateLimit !== undefined) updateData.rateLimit = body.rateLimit;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
    });

    // Remove key hash from response
    const { key, ...sanitized } = apiKey;

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}
