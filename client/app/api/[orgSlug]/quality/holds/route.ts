/**
 * API: Quality Holds Management
 * POST /api/[orgSlug]/quality/holds - Create quality hold
 * GET /api/[orgSlug]/quality/holds - List quality holds
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { enqueueNotification } from '@/lib/notifications';

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
    if (!hasPermission(payload.role, Permission.MANAGE_QUALITY_HOLDS)) {
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
      productId,
      warehouseId,
      inspectionId,
      quantity,
      reason,
      lotNumber,
      batchNumber,
      serialNumber,
      holdType = 'QUALITY',
      notes,
      metadata,
      attachments,
    } = body;

    // Validation
    if (!productId || !reason || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, reason, quantity' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Generate hold number
    const year = new Date().getFullYear();
    const lastHold = await prisma.qualityHold.findFirst({
      where: {
        organizationId: organization.id,
        holdNumber: {
          startsWith: `QH-${year}`,
        },
      },
      orderBy: {
        holdNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastHold) {
      const match = lastHold.holdNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const holdNumber = `QH-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create quality hold and update inventory in transaction
    const qualityHold = await prisma.$transaction(async (tx) => {
      // Create the hold
      const hold = await tx.qualityHold.create({
        data: {
          organizationId: organization.id,
          productId,
          warehouseId,
          inspectionId,
          holdNumber,
          quantity,
          holdType,
          holdReason: reason,
          lotNumber,
          batchNumber,
          serialNumber,
          status: 'ACTIVE',
          dispositionNotes: notes,
          createdById: payload.userId,
          metadata,
          attachments,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update inventory to reduce available quantity
      const inventory = await tx.inventoryItem.findFirst({
        where: {
          productId,
          warehouseLocation: warehouseId ? undefined : 'Main', // Use warehouse if specified, otherwise Main
          ...(warehouseId && { warehouseId }),
        },
      });

      if (inventory) {
        const currentAvailable = Number(inventory.quantityAvailable);
        const heldQuantity = Number(quantity);
        const newAvailable = Math.max(0, currentAvailable - heldQuantity);

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityAvailable: newAvailable,
          },
        });
      }

      return hold;
    });

    // Send notifications for high-priority holds
    const isHighPriority = holdType === 'SAFETY' || holdType === 'REGULATORY' || holdType === 'SUPPLIER_RECALL';

    if (isHighPriority) {
      try {
        // Get warehouse manager and finance head emails
        const warehouseManager = await prisma.user.findFirst({
          where: {
            organizations: {
              some: {
                organizationId: organization.id,
                role: {
                  permissions: {
                    some: {
                      permission: Permission.MANAGE_QUALITY_HOLDS
                    }
                  }
                }
              }
            }
          },
          select: { email: true, name: true }
        });

        if (warehouseManager?.email) {
          await enqueueNotification({
            type: 'email',
            to: warehouseManager.email,
            subject: `High Priority Quality Hold: ${qualityHold.holdNumber}`,
            body: `A high priority quality hold has been placed:

Hold: ${qualityHold.holdNumber}
Product: ${qualityHold.product.name} (${qualityHold.product.sku})
Type: ${holdType}
Reason: ${reason}
Quantity: ${quantity}

Please review immediately.`,
          });
        }
      } catch (notificationError) {
        console.error('Error sending hold notification:', notificationError);
        // Don't fail the API call if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: qualityHold,
    });
  } catch (error: any) {
    console.error('Error creating quality hold:', error);
    return NextResponse.json(
      { error: 'Failed to create quality hold', details: error.message },
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
    if (!hasPermission(payload.role, Permission.VIEW_QUALITY_HOLDS)) {
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
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (status) {
      where.status = status;
    }

    const qualityHolds = await prisma.qualityHold.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        inspection: {
          select: {
            id: true,
            inspectionNumber: true,
          },
        },
        releasedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: qualityHolds,
    });
  } catch (error: any) {
    console.error('Error fetching quality holds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quality holds', details: error.message },
      { status: 500 }
    );
  }
}
