import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { transactionSchema } from '@/lib/validation';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                accountType: true,
              },
            },
          },
          orderBy: {
            entryType: 'asc', // DEBIT first
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
      orderBy: {
        transactionDate: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    // Validate input
    const validation = transactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify all accounts exist and belong to organization
    const accountIds = data.entries.map((e) => e.accountId);
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        organizationId,
      },
    });

    if (accounts.length !== accountIds.length) {
      return NextResponse.json(
        { error: 'One or more accounts not found' },
        { status: 400 }
      );
    }

    // Create account map for easy lookup
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Use DoubleEntryService to create transaction
    const transaction = await DoubleEntryService.createTransaction({
      organizationId,
      transactionDate: new Date(data.transactionDate),
      transactionType: data.transactionType as any,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
      entries: data.entries.map((entry) => ({
        accountId: entry.accountId,
        accountType: accountMap.get(entry.accountId)!.accountType,
        entryType: entry.entryType,
        amount: entry.amount,
        description: entry.description,
      })),
      createdById: userId,
    });

    // Fetch the created transaction with all relations
    const createdTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                accountType: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: createdTransaction,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
