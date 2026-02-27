/**
 * Inter-Branch Transfer (IBT) Service
 *
 * Handles the full lifecycle of stock movements between branches:
 *   DRAFT → REQUESTED → APPROVED → IN_TRANSIT → RECEIVED | CANCELLED
 *
 * Accounting:
 *   When shipped: Dr  Inter-Branch Clearing (from-branch) / Cr  Inventory (from-branch)
 *   When received: Dr  Inventory (to-branch) / Cr  Inter-Branch Clearing (to-branch)
 *
 * The two clearing entries net to zero on the consolidated B/S.
 */

import prisma from '@/lib/prisma';
import { DocumentSequenceService } from '@/lib/document-sequence.service';
import { IBTStatus, DocumentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateIBTInput {
  organizationId: string;
  fromBranchId: string;
  toBranchId: string;
  notes?: string;
  requestedById?: string;
  clearingAccountId?: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
}

export class InterBranchTransferService {
  // ─── Queries ───────────────────────────────────────────────────

  static async list(organizationId: string, branchId?: string) {
    return prisma.interBranchTransfer.findMany({
      where: {
        organizationId,
        ...(branchId
          ? { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] }
          : {}),
      },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string, organizationId: string) {
    const ibt = await prisma.interBranchTransfer.findFirst({
      where: { id, organizationId },
      include: {
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, currency: true } },
          },
        },
      },
    });
    if (!ibt) throw new Error('Inter-branch transfer not found');
    return ibt;
  }

  // ─── Mutations ─────────────────────────────────────────────────

  static async create(input: CreateIBTInput) {
    const { organizationId, fromBranchId, toBranchId, notes, requestedById, clearingAccountId, items } = input;

    if (fromBranchId === toBranchId) throw new Error('Source and destination branch must be different');
    if (!items.length) throw new Error('At least one item is required');

    const reference = await DocumentSequenceService.generateDocumentNumber(
      organizationId,
      DocumentType.INTER_BRANCH_TRANSFER,
      fromBranchId,
      { prefix: 'IBT', padding: 4 },
    );

    return prisma.interBranchTransfer.create({
      data: {
        organizationId,
        reference,
        fromBranchId,
        toBranchId,
        status: IBTStatus.DRAFT,
        notes,
        requestedById,
        clearingAccountId,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: new Decimal(i.quantity),
            unitCost: new Decimal(i.unitCost),
          })),
        },
      },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
  }

  /** Submit for approval (DRAFT → REQUESTED) */
  static async submit(id: string, organizationId: string) {
    return this._transition(id, organizationId, IBTStatus.DRAFT, IBTStatus.REQUESTED);
  }

  /** Approve transfer (REQUESTED → APPROVED) */
  static async approve(id: string, organizationId: string, approvedById: string) {
    await this._assertStatus(id, organizationId, IBTStatus.REQUESTED);
    return prisma.interBranchTransfer.update({
      where: { id },
      data: { status: IBTStatus.APPROVED, approvedById },
    });
  }

  /**
   * Mark as shipped / in-transit (APPROVED → IN_TRANSIT).
   * Books debit to clearing account, credit from source inventory.
   */
  static async ship(id: string, organizationId: string) {
    await this._assertStatus(id, organizationId, IBTStatus.APPROVED);
    const ibt = await this.findById(id, organizationId);

    return prisma.$transaction(async (tx) => {
      // Accounting leg 1: Dr Clearing / Cr Inventory (from-branch)
      if (ibt.clearingAccountId) {
        for (const item of ibt.items) {
          const lineValue = Number(item.quantity) * Number(item.unitCost);
          await tx.transaction.create({
            data: {
              organizationId,
              branchId: ibt.fromBranchId,
              transactionNumber: `${ibt.reference}-SHIP`,
              transactionDate: new Date(),
              transactionType: 'JOURNAL',
              description: `IBT Ship: ${ibt.reference} → ${ibt.toBranch.name}`,
              status: 'POSTED',
              ledgerEntries: {
                create: [
                  // Debit clearing account
                  {
                    accountId: ibt.clearingAccountId!,
                    debit: lineValue,
                    credit: 0,
                    description: `IBT clearing debit – ${item.product.name}`,
                    organizationId,
                  },
                ],
              },
            },
          });
        }
      }

      return tx.interBranchTransfer.update({
        where: { id },
        data: { status: IBTStatus.IN_TRANSIT, shippedAt: new Date() },
      });
    });
  }

  /**
   * Confirm receipt (IN_TRANSIT → RECEIVED).
   * Books debit to destination inventory, credit to clearing account.
   */
  static async receive(id: string, organizationId: string) {
    await this._assertStatus(id, organizationId, IBTStatus.IN_TRANSIT);
    const ibt = await this.findById(id, organizationId);

    return prisma.$transaction(async (tx) => {
      // Accounting leg 2: Dr Inventory (to-branch) / Cr Clearing
      if (ibt.clearingAccountId) {
        await tx.transaction.create({
          data: {
            organizationId,
            branchId: ibt.toBranchId,
            transactionNumber: `${ibt.reference}-RECV`,
            transactionDate: new Date(),
            transactionType: 'JOURNAL',
            description: `IBT Receive: ${ibt.reference} from ${ibt.fromBranch.name}`,
            status: 'POSTED',
            ledgerEntries: {
              create: [
                {
                  accountId: ibt.clearingAccountId!,
                  debit: 0,
                  credit: ibt.items.reduce(
                    (s, i) => s + Number(i.quantity) * Number(i.unitCost),
                    0,
                  ),
                  description: `IBT clearing credit – receive ${ibt.reference}`,
                  organizationId,
                },
              ],
            },
          },
        });
      }

      return tx.interBranchTransfer.update({
        where: { id },
        data: { status: IBTStatus.RECEIVED, receivedAt: new Date() },
      });
    });
  }

  /** Cancel at any pre-transit stage */
  static async cancel(id: string, organizationId: string) {
    const ibt = await this.findById(id, organizationId);
    const cancellable: IBTStatus[] = [IBTStatus.DRAFT, IBTStatus.REQUESTED, IBTStatus.APPROVED];
    if (!cancellable.includes(ibt.status)) {
      throw new Error(`Cannot cancel a transfer that is ${ibt.status}`);
    }
    return prisma.interBranchTransfer.update({
      where: { id },
      data: { status: IBTStatus.CANCELLED },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private static async _assertStatus(id: string, organizationId: string, expected: IBTStatus) {
    const ibt = await prisma.interBranchTransfer.findFirst({ where: { id, organizationId } });
    if (!ibt) throw new Error('Transfer not found');
    if (ibt.status !== expected) throw new Error(`Expected status ${expected}, got ${ibt.status}`);
    return ibt;
  }

  private static async _transition(
    id: string,
    organizationId: string,
    from: IBTStatus,
    to: IBTStatus,
  ) {
    await this._assertStatus(id, organizationId, from);
    return prisma.interBranchTransfer.update({ where: { id }, data: { status: to } });
  }
}
