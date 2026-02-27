import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';
import prisma from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/banking/reconciliation
 * List all reconciliations for the organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const reconciliations = await prisma.bankReconciliation.findMany({
      where: {
        bankAccount: {
          organizationId,
        },
      },
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
            currency: true,
          },
        },
      },
      orderBy: {
        statementDate: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: reconciliations.map((r) => ({
        id: r.id,
        bankAccountId: r.bankAccountId,
        bankAccountName: r.bankAccount.accountName,
        bankName: r.bankAccount.bankName,
        accountNumber: r.bankAccount.accountNumber,
        currency: r.bankAccount.currency,
        statementDate: r.statementDate,
        statementBalance: parseFloat(r.statementBalance.toString()),
        bookBalance: parseFloat(r.bookBalance.toString()),
        difference: parseFloat(r.difference.toString()),
        depositsInTransit: parseFloat(r.depositsInTransit.toString()),
        outstandingChecks: parseFloat(r.outstandingChecks.toString()),
        adjustedBookBalance: parseFloat(r.adjustedBookBalance.toString()),
        status: r.status,
        reconciledBy: r.reconciledBy,
        reconciledAt: r.reconciledAt,
        finalizedAt: r.finalizedAt,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reconciliations',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation
 * Create a new reconciliation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    if (!body.bankAccountId || !body.statementDate || body.statementBalance === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: bankAccountId, statementDate, statementBalance',
        },
        { status: 400 }
      );
    }

    // Get bank account to verify it exists and get book balance
    const bankAccount = await prisma.bankAccount.findUnique({
      where: {
        id: body.bankAccountId,
        organizationId,
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    const bookBalance = parseFloat(bankAccount.currentBalance.toString());
    const statementBalance = parseFloat(body.statementBalance);
    const difference = bookBalance - statementBalance;

    // Determine opening balance: use lastReconciledBalance if available, else opening balance
    const openingBalance = bankAccount.lastReconciledBalance
      ? parseFloat(bankAccount.lastReconciledBalance.toString())
      : parseFloat(bankAccount.openingBalance.toString());

    // Create reconciliation
    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId: body.bankAccountId,
        statementDate: new Date(body.statementDate),
        statementBalance,
        bookBalance,
        difference,
        openingBalance,
        status: 'IN_PROGRESS',
        notes: body.notes,
      },
      include: {
        bankAccount: {
          select: {
            accountName: true,
            accountNumber: true,
            currency: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: reconciliation.id,
        bankAccountId: reconciliation.bankAccountId,
        bankAccountName: reconciliation.bankAccount.accountName,
        statementDate: reconciliation.statementDate,
        statementBalance,
        bookBalance,
        difference,
        status: reconciliation.status,
      },
      message: 'Reconciliation created successfully',
    });
  } catch (error) {
    console.error('Error creating reconciliation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create reconciliation',
      },
      { status: 500 }
    );
  }
}
