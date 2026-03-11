import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { EntryType, TransactionType } from '@prisma/client';

// POST /api/[orgSlug]/credit-notes/[id]/approve - Approve credit note
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

    // Get credit note
    const creditNote = await prisma.creditNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
      include: {
        lineItems: true,
        customer: true,
      },
    });

    if (!creditNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (creditNote.status !== 'DRAFT' && creditNote.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { success: false, error: 'Credit note is not in a state that can be approved' },
        { status: 400 }
      );
    }

    // Update credit note status
    const updatedNote = await prisma.creditNote.update({
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

      // Credit Note reverses the original invoice:
      // DR: Sales Revenue (reduce revenue)
      // DR: Tax Liability (reduce tax owed) - if applicable
      // CR: Accounts Receivable (reduce customer balance)
      const entries: Array<{ accountId: string; entryType: EntryType; amount: number; description: string }> = [];

      // DR Revenue for each line item
      const subtotal = creditNote.lineItems.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
      if (subtotal > 0) {
        entries.push({
          accountId: revenueAccount.id,
          entryType: EntryType.DEBIT,
          amount: subtotal,
          description: `Credit Note ${creditNote.creditNoteNumber} - Revenue reversal`,
        });
      }

      // DR Tax Liability if applicable
      if (Number(creditNote.taxAmount) > 0 && taxAccount) {
        entries.push({
          accountId: taxAccount.id,
          entryType: EntryType.DEBIT,
          amount: Number(creditNote.taxAmount),
          description: `Credit Note ${creditNote.creditNoteNumber} - Tax reversal`,
        });
      }

      // CR Accounts Receivable
      entries.push({
        accountId: arAccount.id,
        entryType: EntryType.CREDIT,
        amount: Number(creditNote.totalAmount),
        description: `Credit Note ${creditNote.creditNoteNumber} - ${creditNote.customer.firstName} ${creditNote.customer.lastName}`,
      });

      const transaction = await DoubleEntryService.createTransaction({
        organizationId: org.id,
        transactionDate: creditNote.creditDate,
        transactionType: TransactionType.JOURNAL_ENTRY,
        description: `Credit Note ${creditNote.creditNoteNumber} - ${creditNote.description || ''}`,
        referenceType: 'CreditNote',
        referenceId: creditNote.id,
        createdById: user.id,
        entries,
      });

      // Link transaction to credit note
      await prisma.creditNote.update({
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
      message: 'Credit note approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve credit note' },
      { status: 500 }
    );
  }
}
