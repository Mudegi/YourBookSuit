import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ExpenseService } from '@/services/expenses/expense.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const expenseLineSchema = z.object({
  categoryId: z.string().cuid(),
  description: z.string().optional().default(''),
  amount: z.number().positive(),
  taxInclusive: z.boolean(),
  taxRateId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  costCenterId: z.string().cuid().optional(),
});

const createExpenseSchema = z.object({
  expenseDate: z.string().transform((val) => new Date(val)),
  payeeVendorId: z.string().cuid().optional(),
  payeeName: z.string().optional(),
  paymentAccountId: z.string().cuid(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'PETTY_CASH', 'DIRECTORS_LOAN']),
  mobileMoneyTransactionId: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  currency: z.string().optional(),
  isReimbursement: z.boolean(),
  claimantUserId: z.string().cuid().optional(),
  lines: z.array(expenseLineSchema).min(1),
  receiptAttachmentId: z.string().cuid().optional(),
  notes: z.string().optional(),
  referenceNumber: z.string().optional(),
});

/**
 * POST /api/orgs/[orgSlug]/expenses
 * Create a new operational expense
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { userId, organizationId, role } = await requireAuth(params.orgSlug);
    const body = await request.json();

    // Validate input
    const validatedData = createExpenseSchema.parse(body);

    // Validate Mobile Money requirements if applicable
    if (validatedData.paymentMethod === 'MOBILE_MONEY') {
      if (!validatedData.mobileMoneyTransactionId) {
        return NextResponse.json(
          { error: 'Mobile Money transaction ID is required' },
          { status: 400 }
        );
      }
    }

    // Validate reimbursement requirements
    if (validatedData.isReimbursement && !validatedData.claimantUserId) {
      return NextResponse.json(
        { error: 'Claimant user ID is required for reimbursement expenses' },
        { status: 400 }
      );
    }

    // Create the expense
    const result = await ExpenseService.createExpense({
      ...validatedData,
      organizationId: organizationId,
      userId: userId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating expense:', error?.message || String(error));
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orgs/[orgSlug]/expenses
 * List expenses with filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentMethod = searchParams.get('paymentMethod');
    const isReimbursement = searchParams.get('isReimbursement');

    const where: any = {
      organizationId: organizationId,
      transactionType: 'JOURNAL_ENTRY',
      referenceType: 'EXPENSE',
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    if (paymentMethod) {
      where.metadata = {
        path: ['paymentMethod'],
        equals: paymentMethod,
      };
    }

    if (isReimbursement) {
      where.metadata = {
        ...where.metadata,
        path: ['isReimbursement'],
        equals: isReimbursement === 'true',
      };
    }

    const expenses = await prisma.transaction.findMany({
      where,
      include: {
        ledgerEntries: {
          include: {
            account: true,
          },
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
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    // Transform expenses to include calculated amounts
    const transformedExpenses = expenses.map((expense) => {
      // Calculate total from debit entries (expense accounts)
      const debitTotal = expense.ledgerEntries
        .filter((entry: any) => entry.entryType === 'DEBIT')
        .reduce((sum: number, entry: any) => sum + parseFloat(entry.amount.toString()), 0);
      
      return {
        ...expense,
        calculatedTotal: debitTotal,
      };
    });

    return NextResponse.json({ success: true, expenses: transformedExpenses });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}
