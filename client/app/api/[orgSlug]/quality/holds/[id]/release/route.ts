/**
 * API: Release Quality Hold
 * PATCH /api/[orgSlug]/quality/holds/[id]/release - Release quality hold
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { getQualityHoldAccounts, getProductCostBasis } from '@/lib/quality-hold-accounts';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.RELEASE_QUALITY_HOLDS)) {
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
    const { disposition, releaseNotes } = body;

    // Validation
    if (!disposition) {
      return NextResponse.json(
        { error: 'Missing required field: disposition' },
        { status: 400 }
      );
    }

    // Find the hold
    const hold = await prisma.qualityHold.findUnique({
      where: { id: params.id },
    });

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    if (hold.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (hold.status === 'RELEASED') {
      return NextResponse.json({ error: 'Hold already released' }, { status: 400 });
    }

    // Update hold, restore inventory, and handle financial transactions
    const updatedHold = await prisma.$transaction(async (tx) => {
      // Update the hold status
      const hold = await tx.qualityHold.update({
        where: { id: params.id },
        data: {
          status: disposition === 'SCRAP' ? 'SCRAPPED' : disposition === 'RETURN_TO_VENDOR' ? 'RETURNED' : disposition === 'REWORK' ? 'REWORKED' : 'RELEASED',
          dispositionAction: disposition,
          dispositionNotes: releaseNotes,
          releasedById: payload.userId,
          releasedAt: new Date(),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              purchasePrice: true,
              sellingPrice: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
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
      });

      // Restore inventory availability for RELEASE dispositions
      if (disposition === 'USE_AS_IS') {
        const inventory = await tx.inventoryItem.findFirst({
          where: {
            productId: hold.productId,
            warehouseLocation: hold.warehouseId ? undefined : 'Main',
            ...(hold.warehouseId && { warehouseId: hold.warehouseId }),
          },
        });

        if (inventory) {
          const currentAvailable = Number(inventory.quantityAvailable);
          const heldQuantity = Number(hold.quantity);
          const newAvailable = currentAvailable + heldQuantity;

          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              quantityAvailable: newAvailable,
            },
          });
        }
      }

      // Handle financial transactions for all dispositions that affect GL
      if (disposition === 'SCRAP' || disposition === 'RETURN_TO_VENDOR' || disposition === 'REWORK') {
        // Get appropriate GL accounts
        const accounts = await getQualityHoldAccounts(tx, organization.id);

        // Get cost basis for the held quantity
        const { costBasis } = await getProductCostBasis(
          tx,
          organization.id,
          hold.productId,
          Number(hold.quantity),
          hold.warehouseId || undefined
        );

        const totalValue = costBasis * Number(hold.quantity);

        if (totalValue > 0) {
          // Generate transaction number
          const year = new Date().getFullYear();
          const lastTransaction = await tx.transaction.findFirst({
            where: {
              organizationId: organization.id,
              transactionNumber: {
                startsWith: `JE-${year}`,
              },
            },
            orderBy: {
              transactionNumber: 'desc',
            },
          });

          let nextNumber = 1;
          if (lastTransaction) {
            const match = lastTransaction.transactionNumber.match(/-(\d+)$/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }

          const transactionNumber = `JE-${year}-${String(nextNumber).padStart(4, '0')}`;

          let description: string;
          let creditAccount: string;
          let debitAccount: string;

          switch (disposition) {
            case 'SCRAP':
              description = `Quality Hold Scrap: ${hold.holdNumber} - ${hold.product.name}`;
              creditAccount = accounts.inventoryAccount; // Reduce inventory
              debitAccount = accounts.lossAccount; // Record loss
              break;

            case 'RETURN_TO_VENDOR':
              description = `Quality Hold RTV: ${hold.holdNumber} - ${hold.product.name}`;
              creditAccount = accounts.inventoryAccount; // Reduce inventory
              debitAccount = accounts.rtvAccount || accounts.lossAccount; // RTV expense or loss
              break;

            case 'REWORK':
              description = `Quality Hold Rework: ${hold.holdNumber} - ${hold.product.name}`;
              creditAccount = accounts.inventoryAccount; // Reduce inventory
              debitAccount = accounts.reworkAccount || accounts.lossAccount; // Rework expense or loss
              break;

            default:
              throw new Error(`Unsupported disposition: ${disposition}`);
          }

          await tx.transaction.create({
            data: {
              organizationId: organization.id,
              transactionNumber,
              transactionDate: new Date(),
              transactionType: 'JOURNAL_ENTRY',
              description,
              createdById: payload.userId,
              lines: {
                create: [
                  {
                    accountId: creditAccount,
                    debit: 0,
                    credit: totalValue,
                    description: `Inventory reduction for ${disposition.toLowerCase()}`,
                  },
                  {
                    accountId: debitAccount,
                    debit: totalValue,
                    credit: 0,
                    description: `Cost of ${disposition.toLowerCase()}`,
                  },
                ],
              },
            },
          });
        }
      }

      return hold;
    });

    return NextResponse.json({
      success: true,
      data: updatedHold,
    });
  } catch (error: any) {
    console.error('Error releasing quality hold:', error);
    return NextResponse.json(
      { error: 'Failed to release quality hold', details: error.message },
      { status: 500 }
    );
  }
}
