import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BankAccountService } from '@/services/banking/bank-account.service';

const prisma = new PrismaClient();
const bankAccountService = new BankAccountService();

/**
 * POST /api/orgs/[orgSlug]/bank-transfers
 * Transfer money between bank accounts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;
    const body = await request.json();

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!body.fromAccountId) {
      return NextResponse.json(
        { error: 'Source bank account ID is required' },
        { status: 400 }
      );
    }

    if (!body.toAccountId) {
      return NextResponse.json(
        { error: 'Destination bank account ID is required' },
        { status: 400 }
      );
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Transfer amount must be greater than zero' },
        { status: 400 }
      );
    }

    if (!body.transferDate) {
      return NextResponse.json({ error: 'Transfer date is required' }, { status: 400 });
    }

    // Perform transfer
    const bankTransfer = await bankAccountService.transferBetweenAccounts({
      organizationId: organization.id,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amount: body.amount,
      transferDate: new Date(body.transferDate),
      reference: body.reference,
      notes: body.notes,
      createdBy: userId,
    });

    return NextResponse.json(bankTransfer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bank transfer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create bank transfer' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orgs/[orgSlug]/bank-transfers
 * Get all bank transfers for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;
    const searchParams = request.nextUrl.searchParams;
    const bankAccountId = searchParams.get('bankAccountId');
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build where clause
    const whereClause: any = {
      organizationId: organization.id,
    };

    if (bankAccountId) {
      whereClause.OR = [
        { fromAccountId: bankAccountId },
        { toAccountId: bankAccountId },
      ];
    }

    if (startDate || endDate) {
      whereClause.transferDate = {};
      if (startDate) {
        whereClause.transferDate.gte = startDate;
      }
      if (endDate) {
        whereClause.transferDate.lte = endDate;
      }
    }

    // Get transfers
    const transfers = await prisma.bankTransfer.findMany({
      where: whereClause,
      include: {
        fromAccount: {
          include: { account: true },
        },
        toAccount: {
          include: { account: true },
        },
        transaction: true,
      },
      orderBy: {
        transferDate: 'desc',
      },
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    console.error('Error fetching bank transfers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bank transfers' },
      { status: 500 }
    );
  }
}
