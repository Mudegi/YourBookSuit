import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BankAccountService } from '@/services/banking/bank-account.service';

const prisma = new PrismaClient();
const bankAccountService = new BankAccountService();

/**
 * GET /api/orgs/[orgSlug]/bank-accounts
 * List all bank accounts for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get bank accounts
    const bankAccounts = await bankAccountService.getBankAccounts(
      organization.id,
      includeInactive
    );

    // Calculate summary statistics
    const activeBankAccounts = bankAccounts.filter((account) => account.isActive);
    const totalBalance = activeBankAccounts.reduce(
      (sum, account) => sum + account.currentBalance,
      0
    );

    const stats = {
      totalAccounts: bankAccounts.length,
      activeAccounts: activeBankAccounts.length,
      totalBalance,
    };

    return NextResponse.json({ bankAccounts, stats });
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/bank-accounts
 * Create a new bank account
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

    // Validate required fields
    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Chart of Accounts account ID is required' },
        { status: 400 }
      );
    }

    if (!body.bankName) {
      return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
    }

    if (!body.accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    if (!body.accountType) {
      return NextResponse.json({ error: 'Account type is required' }, { status: 400 });
    }

    // Create bank account
    const bankAccount = await bankAccountService.createBankAccount({
      organizationId: organization.id,
      accountId: body.accountId,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountType: body.accountType,
      routingNumber: body.routingNumber,
      currency: body.currency,
      isActive: body.isActive,
    });

    return NextResponse.json(bankAccount, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create bank account' },
      { status: 500 }
    );
  }
}
