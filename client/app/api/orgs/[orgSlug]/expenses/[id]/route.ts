import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/expenses/[id]
 * Get a single expense transaction by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const expense = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        organizationId,
        transactionType: 'JOURNAL_ENTRY',
        referenceType: 'EXPENSE',
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                accountType: true,
                currency: true,
              },
            },
          },
          orderBy: { entryType: 'asc' }, // DEBITs first
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Calculate total from debit entries
    const calculatedTotal = expense.ledgerEntries
      .filter((entry) => entry.entryType === 'DEBIT')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    return NextResponse.json({
      success: true,
      expense: {
        ...expense,
        calculatedTotal,
      },
    });
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}
