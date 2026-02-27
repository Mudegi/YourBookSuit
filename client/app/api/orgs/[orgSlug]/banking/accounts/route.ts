import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankingService } from '@/services/banking/banking.service';

/**
 * GET /api/orgs/[orgSlug]/banking/accounts
 * List all bank accounts with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, baseCurrency: true },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const accountType = searchParams.get('accountType') as any;

    const result = await BankingService.getBankAccounts(org.id, {
      includeInactive,
      accountType: accountType || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Banking accounts GET error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/banking/accounts
 * Create a new bank account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, baseCurrency: true },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    const required = ['accountName', 'accountNumber', 'bankName', 'accountType', 'glAccountId'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const bankAccount = await BankingService.createBankAccount({
      organizationId: org.id,
      accountName: body.accountName,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      currency: body.currency || org.baseCurrency || 'USD',
      accountType: body.accountType,
      glAccountId: body.glAccountId,
      openingBalance: body.openingBalance ? parseFloat(body.openingBalance) : 0,
      routingNumber: body.routingNumber || undefined,
      swiftCode: body.swiftCode || undefined,
      mobileMerchantId: body.mobileMerchantId || undefined,
      mobileShortcode: body.mobileShortcode || undefined,
      description: body.description || undefined,
      branchId: body.branchId || undefined,
    });

    return NextResponse.json({ success: true, bankAccount }, { status: 201 });
  } catch (error: any) {
    console.error('Banking accounts POST error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create bank account' },
      { status: error.message?.includes('already') ? 409 : 500 }
    );
  }
}
