import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chartOfAccountSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const account = await prisma.chartOfAccount.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Build where clause for ledger entries
    const ledgerWhere: any = {
      accountId: params.id,
    };

    if (startDate || endDate) {
      ledgerWhere.transaction = {
        transactionDate: {},
      };
      if (startDate) {
        ledgerWhere.transaction.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        ledgerWhere.transaction.transactionDate.lte = new Date(endDate);
      }
    }

    // Fetch ledger entries with date filtering
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: ledgerWhere,
      include: {
        transaction: {
          select: {
            id: true,
            transactionDate: true,
            reference: true,
            description: true,
          },
        },
      },
      orderBy: [
        {
          transaction: {
            transactionDate: 'asc',
          },
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = ledgerEntries.map((entry) => {
      if (entry.entryType === 'DEBIT') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }

      return {
        ...entry,
        balance: runningBalance,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        account,
        ledgerEntries: entriesWithBalance,
      },
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = chartOfAccountSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if account exists
    const existingAccount = await prisma.chartOfAccount.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (data.code !== existingAccount.code) {
      const codeExists = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId,
          code: data.code,
          NOT: {
            id: params.id,
          },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'Account code already exists' },
          { status: 400 }
        );
      }
    }

    // Update account
    const account = await prisma.chartOfAccount.update({
      where: {
        id: params.id,
      },
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        category: data.category,
        subCategory: data.subCategory,
        description: data.description,
        isActive: data.isActive,
        currency: data.currency,
      },
    });

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if account exists
    const account = await prisma.chartOfAccount.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if account has transactions
    if (account._count.ledgerEntries > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing transactions. Please deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete account
    await prisma.chartOfAccount.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
