import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { JournalEntryService } from '@/services/accounting/journal-entry.service';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import prisma from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import { EntryType, TransactionType } from '@prisma/client';

/**
 * GET /api/orgs/[orgSlug]/journal-entries/[id]
 * Get a single journal entry with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const transaction = await prisma.transaction.findFirst({
      where: { id: params.id, organizationId },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: { id: true, code: true, name: true, accountType: true, accountSubType: true },
            },
          },
          orderBy: { entryType: 'asc' },
        },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 });
    }

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;
    for (const le of transaction.ledgerEntries) {
      const amt = Number(le.amount);
      if (le.entryType === 'DEBIT') totalDebits += amt;
      else totalCredits += amt;
    }

    // Parse metadata
    const metadata = (transaction.metadata as any) || {};

    return NextResponse.json({
      success: true,
      data: {
        ...transaction,
        taxAmount: transaction.taxAmount ? Number(transaction.taxAmount) : null,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        reference: metadata.reference || transaction.referenceId || transaction.transactionNumber,
        journalType: metadata.journalType || 'General',
        ledgerEntries: transaction.ledgerEntries.map((le: any) => ({
          ...le,
          amount: Number(le.amount),
          amountInBase: Number(le.amountInBase),
          exchangeRate: Number(le.exchangeRate),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch journal entry' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgSlug]/journal-entries/[id]
 * Edit a DRAFT journal entry, or POST a draft (action=post)
 * POSTED entries are immutable — must use reversal instead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, organizationId },
      include: { ledgerEntries: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 });
    }

    // ── IMMUTABILITY: Posted entries cannot be edited ──
    if (existing.status === 'POSTED') {
      return NextResponse.json(
        { success: false, error: 'Posted journal entries are immutable. Create a reversing entry to correct mistakes.' },
        { status: 400 }
      );
    }

    if (existing.status === 'VOIDED' || existing.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: `Cannot edit a ${existing.status.toLowerCase()} journal entry` },
        { status: 400 }
      );
    }

    // ── ACTION: Post a draft ──
    if (body.action === 'post') {
      // Validate balance before posting
      const entries = existing.ledgerEntries.map((le) => ({
        accountId: le.accountId,
        entryType: le.entryType as EntryType,
        amount: Number(le.amount),
      }));

      JournalEntryService.validateBalance(entries);

      // Validate control accounts
      await JournalEntryService.validateControlAccounts(
        entries.map((e) => e.accountId),
        organizationId
      );

      // Update status to POSTED and update COA balances
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: params.id },
          data: {
            status: 'POSTED',
            approvedById: userId,
            approvedAt: new Date(),
          },
        });

        // Update account balances
        for (const le of existing.ledgerEntries) {
          const amount = new Decimal(le.amount.toString());
          const account = await tx.chartOfAccount.findUnique({ where: { id: le.accountId } });
          if (!account) continue;

          let newBalance = new Decimal(account.balance.toString());

          if (
            (account.accountType === 'ASSET' || account.accountType === 'EXPENSE' || account.accountType === 'COST_OF_SALES') &&
            le.entryType === 'DEBIT'
          ) {
            newBalance = newBalance.plus(amount);
          } else if (
            (account.accountType === 'ASSET' || account.accountType === 'EXPENSE' || account.accountType === 'COST_OF_SALES') &&
            le.entryType === 'CREDIT'
          ) {
            newBalance = newBalance.minus(amount);
          } else if (
            (account.accountType === 'LIABILITY' || account.accountType === 'EQUITY' || account.accountType === 'REVENUE') &&
            le.entryType === 'CREDIT'
          ) {
            newBalance = newBalance.plus(amount);
          } else {
            newBalance = newBalance.minus(amount);
          }

          await tx.chartOfAccount.update({
            where: { id: le.accountId },
            data: { balance: newBalance.toNumber() },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Journal entry posted successfully. COA balances updated.',
      });
    }

    // ── ACTION: Edit a draft ──
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });
    const currency = body.currency || (org?.baseCurrency ?? 'UGX');
    const exchangeRate = body.exchangeRate || 1;
    const metadata = (existing.metadata as any) || {};

    // Delete old ledger entries and create new ones
    await prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.deleteMany({ where: { transactionId: params.id } });

      await tx.transaction.update({
        where: { id: params.id },
        data: {
          transactionDate: body.journalDate ? new Date(body.journalDate) : undefined,
          description: body.description ? `[${body.journalType || metadata.journalType || 'General'}] ${body.description}` : undefined,
          notes: body.notes !== undefined ? body.notes : undefined,
          branchId: body.branchId !== undefined ? (body.branchId || null) : undefined,
          metadata: {
            ...metadata,
            ...(body.journalType && { journalType: body.journalType }),
            ...(body.referenceNumber && { reference: body.referenceNumber }),
            currency,
            exchangeRate,
            ...(body.isReversal !== undefined && { isReversal: body.isReversal }),
            ...(body.reversalDate !== undefined && { reversalDate: body.reversalDate }),
          },
          ledgerEntries: {
            create: body.entries.map((e: any) => ({
              accountId: e.accountId,
              entryType: e.entryType,
              amount: e.amount,
              currency,
              exchangeRate,
              amountInBase: e.amount * exchangeRate,
              description: e.description || body.description || '',
            })),
          },
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Draft updated successfully' });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update journal entry' }, { status: 500 });
  }
}

/**
 * DELETE /api/orgs/[orgSlug]/journal-entries/[id]
 * Only DRAFT entries can be deleted. POSTED entries must be reversed.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft journal entries can be deleted. Posted entries must be reversed.' },
        { status: 400 }
      );
    }

    await prisma.transaction.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Draft journal entry deleted' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
}
