import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/bank-accounts
 * List all bank accounts for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  console.log('🏦 === Bank Accounts API Called ===');
  console.log('OrgSlug:', params.orgSlug);
  
  try {
    console.log('Step 1: Getting organization by slug...');
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    
    if (!org) {
      console.log('Organization not found');
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    console.log('Org found:', { id: org.id, slug: org.slug });

    console.log('Step 2: Fetching chart of accounts...');
    const allAccounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        currency: true,
        balance: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
    
    console.log('Step 3: Found', allAccounts.length, 'accounts');

    // Filter for ASSET accounts (bank/cash)
    const glAccounts = allAccounts.filter(a => a.accountType === 'ASSET');

    console.log('🏦 Bank accounts debug:', {
      organizationId: org.id,
      organizationSlug: params.orgSlug,
      totalAccounts: allAccounts.length,
      assetAccounts: glAccounts.length,
    });

    // Simple stats from GL accounts
    const stats = {
      totalAccounts: allAccounts.length,
      activeAccounts: glAccounts.length,
    };

    const response = { 
      data: glAccounts.length > 0 ? glAccounts : allAccounts,
      stats,
    };
    
    console.log('Step 4: Returning', (glAccounts.length > 0 ? glAccounts.length : allAccounts.length), 'accounts');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Bank accounts error:', error.message);
    console.error('Stack:', error.stack);
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
    const body = await request.json();
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
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

    // Create bank account record
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: org.id,
        accountId: body.accountId,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountType: body.accountType,
        routingNumber: body.routingNumber,
        currency: body.currency || 'UGX',
        isActive: body.isActive ?? true,
        currentBalance: 0,
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
