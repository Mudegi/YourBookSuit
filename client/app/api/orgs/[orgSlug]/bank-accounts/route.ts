import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoCreateBankGLAccount } from '@/lib/auto-create-bank-gl';

/**
 * GET /api/orgs/[orgSlug]/bank-accounts
 * Returns real BankAccount records (linked to GL accounts) for payment forms.
 * Each bank account has a glAccountId pointing to its ChartOfAccount for double-entry.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch real BankAccount records with their linked GL account
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organizationId: org.id, isActive: true },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        bankName: true,
        currency: true,
        currentBalance: true,
        glAccountId: true,
        accountType: true,
      },
      orderBy: { accountName: 'asc' },
    });

    return NextResponse.json({ data: bankAccounts, bankAccounts });
  } catch (error: any) {
    console.error('❌ Bank accounts error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/bank-accounts
 * Create a new bank account linked to a GL account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const body = await request.json();
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!body.bankName) return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
    if (!body.accountNumber) return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    if (!body.accountName) return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    if (!body.accountType) return NextResponse.json({ error: 'Account type is required' }, { status: 400 });

    // Auto-create a GL sub-account if none provided
    const glAccountId = body.glAccountId
      || await autoCreateBankGLAccount(org.id, body.bankName, body.currency || 'UGX');

    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: org.id,
        accountName: body.accountName,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountType: body.accountType,
        glAccountId,
        routingNumber: body.routingNumber || null,
        currency: body.currency || 'UGX',
        isActive: body.isActive ?? true,
        currentBalance: body.openingBalance || 0,
      },
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
