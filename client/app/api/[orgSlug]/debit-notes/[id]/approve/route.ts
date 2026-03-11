import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { EntryType, TransactionType } from '@prisma/client';

// POST /api/[orgSlug]/debit-notes/[id]/approve - Approve debit note
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { approvalNotes, autoPost } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const debitNote = await prisma.debitNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
      include: {
        lineItems: true,
        customer: true,
      },
    });

    if (!debitNote) {
      return NextResponse.json({ success: false, error: 'Debit note not found' }, { status: 404 });
    }

    if (debitNote.status !== 'DRAFT' && debitNote.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { success: false, error: 'Debit note is not in a state that can be approved' },
        { status: 400 }
      );
    }

    const updatedNote = await prisma.debitNote.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || undefined,
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    // Auto-post to GL if requested
    if (autoPost) {
      // Look up required GL accounts
      const arAccount = await prisma.chartOfAccount.findFirst({
        where: { organizationId: org.id, code: { startsWith: '1200' }, accountType: 'ASSET', isActive: true },
        orderBy: { code: 'asc' },
      });
      const revenueAccount = await prisma.chartOfAccount.findFirst({
        where: { organizationId: org.id, code: { startsWith: '4' }, accountType: 'REVENUE', isActive: true },
        orderBy: { code: 'asc' },
      });
      const taxAccount = await prisma.chartOfAccount.findFirst({
        where: { organizationId: org.id, code: { startsWith: '2100' }, accountType: 'LIABILITY', isActive: true },
        orderBy: { code: 'asc' },
      });

      if (!arAccount || !revenueAccount) {
        return NextResponse.json(
          { success: false, error: 'Required GL accounts (AR, Revenue) not found. Please configure Chart of Accounts.' },
          { status: 400 }
        );
      }

      // Debit Note increases customer balance (additional charge):
      // DR: Accounts Receivable (increase customer balance)
      // CR: Revenue (record additional income)
      // CR: Tax Liability (record tax owed) - if applicable
      const entries: Array<{ accountId: string; entryType: EntryType; amount: number; description: string }> = [];

      // DR Accounts Receivable
      entries.push({
        accountId: arAccount.id,
        entryType: EntryType.DEBIT,
        amount: Number(debitNote.totalAmount),
        description: `Debit Note ${debitNote.debitNoteNumber} - ${debitNote.customer.firstName} ${debitNote.customer.lastName}`,
      });

      // CR Revenue for the subtotal
      const subtotal = debitNote.lineItems.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
      if (subtotal > 0) {
        entries.push({
          accountId: revenueAccount.id,
          entryType: EntryType.CREDIT,
          amount: subtotal,
          description: `Debit Note ${debitNote.debitNoteNumber} - Additional income`,
        });
      }

      // CR Tax Liability if applicable
      if (Number(debitNote.taxAmount) > 0 && taxAccount) {
        entries.push({
          accountId: taxAccount.id,
          entryType: EntryType.CREDIT,
          amount: Number(debitNote.taxAmount),
          description: `Debit Note ${debitNote.debitNoteNumber} - Tax`,
        });
      }

      const transaction = await DoubleEntryService.createTransaction({
        organizationId: org.id,
        transactionDate: debitNote.debitDate,
        transactionType: TransactionType.JOURNAL_ENTRY,
        description: `Debit Note ${debitNote.debitNoteNumber} - ${debitNote.description || ''}`,
        referenceType: 'DebitNote',
        referenceId: debitNote.id,
        createdById: user.id,
        entries,
      });

      await prisma.debitNote.update({
        where: { id: params.id },
        data: {
          isPosted: true,
          postedAt: new Date(),
          transactionId: transaction.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: 'Debit note approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving debit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve debit note' },
      { status: 500 }
    );
  }
}
