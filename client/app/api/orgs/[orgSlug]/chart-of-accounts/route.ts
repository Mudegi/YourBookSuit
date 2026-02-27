import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { chartOfAccountSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const includeBalances = searchParams.get('includeBalances') === 'true';

    // Build where clause
    const where: any = { organizationId };

    if (type && type !== 'ALL') {
      where.accountType = type;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: {
            ledgerEntries: true,
            children: true,
          },
        },
      },
    });

    // If includeBalances, calculate from ledger entries
    let enrichedAccounts = accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
      foreignBalance: a.foreignBalance ? Number(a.foreignBalance) : null,
    }));

    if (includeBalances) {
      const accountIds = accounts.map((a) => a.id);
      const balances = await prisma.ledgerEntry.groupBy({
        by: ['accountId', 'entryType'],
        where: { accountId: { in: accountIds } },
        _sum: { amountInBase: true, amount: true },
      });

      const balanceMap = new Map<string, { base: number; foreign: number }>();
      for (const b of balances) {
        const current = balanceMap.get(b.accountId) || { base: 0, foreign: 0 };
        const baseAmt = Number(b._sum.amountInBase || 0);
        const foreignAmt = Number(b._sum.amount || 0);
        if (b.entryType === 'DEBIT') {
          current.base += baseAmt;
          current.foreign += foreignAmt;
        } else {
          current.base -= baseAmt;
          current.foreign -= foreignAmt;
        }
        balanceMap.set(b.accountId, current);
      }

      enrichedAccounts = enrichedAccounts.map((a) => {
        const computed = balanceMap.get(a.id);
        return {
          ...a,
          balance: computed ? computed.base : Number(a.balance),
          computedBalance: computed ? computed.base : 0,
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: enrichedAccounts,
    });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

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

    // Check unique code per org
    const existingAccount = await prisma.chartOfAccount.findFirst({
      where: { organizationId, code: data.code },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: `Account code "${data.code}" already exists in this organization` },
        { status: 400 }
      );
    }

    // If parent specified, validate it
    let level = 0;
    let fullPath = data.code;

    if (data.parentId) {
      const parent = await prisma.chartOfAccount.findFirst({
        where: { id: data.parentId, organizationId },
      });

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 400 }
        );
      }

      // Parent and child must share the same account type
      if (parent.accountType !== data.accountType) {
        return NextResponse.json(
          { error: `Child account must be the same type as parent (${parent.accountType})` },
          { status: 400 }
        );
      }

      level = parent.level + 1;
      fullPath = parent.fullPath ? `${parent.fullPath}/${data.code}` : `${parent.code}/${data.code}`;

      // Mark parent hasChildren
      await prisma.chartOfAccount.update({
        where: { id: data.parentId },
        data: { hasChildren: true },
      });
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        accountType: data.accountType,
        accountSubType: data.accountSubType || null,
        parentId: data.parentId || null,
        currency: data.currency || org?.baseCurrency || 'USD',
        description: data.description || null,
        isActive: true,
        isSystem: false,
        allowManualJournal: true,
        level,
        fullPath,
        hasChildren: false,
        balance: 0,
        tags: [],
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { ledgerEntries: true, children: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        balance: Number(account.balance),
        foreignBalance: account.foreignBalance ? Number(account.foreignBalance) : null,
      },
    });
  } catch (error: any) {
    console.error('Error creating account:', error);
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
