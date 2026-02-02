import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
      // Create GL transaction
      const lastTransaction = await prisma.transaction.findFirst({
        where: { organizationId: org.id },
        orderBy: { transactionNumber: 'desc' },
      });

      const lastNumber = lastTransaction
        ? parseInt(lastTransaction.transactionNumber.split('-').pop() || '0')
        : 0;
      const transactionNumber = `TXN-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(6, '0')}`;

      // Create transaction with ledger entries
      const transaction = await prisma.transaction.create({
        data: {
          organizationId: org.id,
          transactionNumber,
          transactionDate: creditNote.creditDate,
          transactionType: 'JOURNAL_ENTRY',
          referenceType: 'CreditNote',
          referenceId: creditNote.id,
          description: `Credit Note ${creditNote.creditNoteNumber} - ${creditNote.description}`,
          status: 'POSTED',
          createdById: user.id,
          ledgerEntries: {
            create: [
              // Debit: Sales Revenue (reduce revenue)
              ...creditNote.lineItems.map((item: any) => ({
                accountId: item.accountId || '', // Revenue account
                description: item.description,
                debitAmount: item.subtotal,
                creditAmount: 0,
                entryType: 'DEBIT',
              })),
              // Debit: Tax Liability (reduce tax owed)
              ...(creditNote.taxAmount > 0
                ? [
                    {
                      accountId: '', // TODO: Get tax liability account
                      description: 'Tax on credit note',
                      debitAmount: creditNote.taxAmount,
                      creditAmount: 0,
                      entryType: 'DEBIT' as const,
                    },
                  ]
                : []),
              // Credit: Accounts Receivable (reduce customer balance)
              {
                accountId: '', // TODO: Get AR account
                description: `${creditNote.customer.firstName} ${creditNote.customer.lastName}`,
                debitAmount: 0,
                creditAmount: creditNote.totalAmount,
                entryType: 'CREDIT' as const,
              },
            ],
          },
        },
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
