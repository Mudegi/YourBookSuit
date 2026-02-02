import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
      const lastTransaction = await prisma.transaction.findFirst({
        where: { organizationId: org.id },
        orderBy: { transactionNumber: 'desc' },
      });

      const lastNumber = lastTransaction
        ? parseInt(lastTransaction.transactionNumber.split('-').pop() || '0')
        : 0;
      const transactionNumber = `TXN-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(6, '0')}`;

      const transaction = await prisma.transaction.create({
        data: {
          organizationId: org.id,
          transactionNumber,
          transactionDate: debitNote.debitDate,
          transactionType: 'JOURNAL_ENTRY',
          referenceType: 'DebitNote',
          referenceId: debitNote.id,
          description: `Debit Note ${debitNote.debitNoteNumber} - ${debitNote.description}`,
          status: 'POSTED',
          createdById: user.id,
          ledgerEntries: {
            create: [
              // Debit: Accounts Receivable (increase customer balance)
              {
                accountId: '', // TODO: Get AR account
                description: `${debitNote.customer.firstName} ${debitNote.customer.lastName}`,
                debitAmount: debitNote.totalAmount,
                creditAmount: 0,
                entryType: 'DEBIT',
              },
              // Credit: Revenue/Other Income (record additional income)
              ...debitNote.lineItems.map((item: any) => ({
                accountId: item.accountId || '',
                description: item.description,
                debitAmount: 0,
                creditAmount: item.subtotal,
                entryType: 'CREDIT' as const,
              })),
              // Credit: Tax Liability (record tax owed)
              ...(debitNote.taxAmount > 0
                ? [
                    {
                      accountId: '', // TODO: Get tax liability account
                      description: 'Tax on debit note',
                      debitAmount: 0,
                      creditAmount: debitNote.taxAmount,
                      entryType: 'CREDIT' as const,
                    },
                  ]
                : []),
            ],
          },
        },
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
