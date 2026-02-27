import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankingService } from '@/services/banking/banking.service';

/**
 * GET /api/orgs/[orgSlug]/banking/accounts/[id]
 * Get single bank account details + transactions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const includeTransactions = searchParams.get('includeTransactions') === 'true';

    const account = await BankingService.getBankAccountById(params.id, org.id);

    let transactions: any[] = [];
    if (includeTransactions) {
      transactions = await BankingService.getAccountTransactions(params.id, org.id, {
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        limit: 100,
      });
    }

    return NextResponse.json({ success: true, account, transactions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgSlug]/banking/accounts/[id]
 * Update a bank account
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await request.json();
    const updated = await BankingService.updateBankAccount(params.id, org.id, body);

    return NextResponse.json({ success: true, bankAccount: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgSlug]/banking/accounts/[id]
 * Delete / deactivate a bank account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const result = await BankingService.deleteBankAccount(params.id, org.id);

    return NextResponse.json({
      success: true,
      message: result.softDeleted
        ? 'Bank account deactivated (has existing transactions)'
        : 'Bank account deleted',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}
