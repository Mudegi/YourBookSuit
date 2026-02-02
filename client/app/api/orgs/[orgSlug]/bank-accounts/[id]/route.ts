import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BankAccountService } from '@/services/banking/bank-account.service';

const prisma = new PrismaClient();
const bankAccountService = new BankAccountService();

/**
 * GET /api/orgs/[orgSlug]/bank-accounts/[id]
 * Get a single bank account by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeTransactions = searchParams.get('includeTransactions') === 'true';
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

    // Get bank account
    const bankAccount = await bankAccountService.getBankAccountById(id, organization.id);

    // Get transactions if requested
    let transactions = [];
    if (includeTransactions) {
      transactions = await bankAccountService.getBankAccountTransactions(
        id,
        organization.id,
        100,
        startDate,
        endDate
      );
    }

    return NextResponse.json({ ...bankAccount, transactions });
  } catch (error: any) {
    console.error('Error fetching bank account:', error);
    if (error.message === 'Bank account not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bank account' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgSlug]/bank-accounts/[id]
 * Update a bank account
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;
    const body = await request.json();

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Update bank account
    const bankAccount = await bankAccountService.updateBankAccount(id, organization.id, {
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountType: body.accountType,
      routingNumber: body.routingNumber,
      currency: body.currency,
      isActive: body.isActive,
    });

    return NextResponse.json(bankAccount);
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    if (error.message === 'Bank account not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update bank account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgSlug]/bank-accounts/[id]
 * Delete a bank account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Delete bank account
    await bankAccountService.deleteBankAccount(id, organization.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bank account:', error);
    if (error.message === 'Bank account not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete bank account' },
      { status: 500 }
    );
  }
}
