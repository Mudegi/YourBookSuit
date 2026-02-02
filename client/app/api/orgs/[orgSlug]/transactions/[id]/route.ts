import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

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

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            entryType: 'asc',
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
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
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

    // Check if transaction exists
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.status === 'VOIDED') {
      return NextResponse.json(
        { error: 'Transaction is already voided' },
        { status: 400 }
      );
    }

    // Use DoubleEntryService to void transaction
    const doubleEntryService = new DoubleEntryService();
    await doubleEntryService.voidTransaction(params.id, userId);

    return NextResponse.json({
      success: true,
      message: 'Transaction voided successfully',
    });
  } catch (error) {
    console.error('Error voiding transaction:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to void transaction' },
      { status: 500 }
    );
  }
}
