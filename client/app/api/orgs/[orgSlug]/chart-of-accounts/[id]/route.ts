import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chartOfAccountSchema } from '@/lib/validation';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const account = await prisma.chartOfAccount.findFirst({
      where: { id: params.id, organizationId },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true, accountType: true, balance: true, isActive: true },
          orderBy: { code: 'asc' },
        },
        _count: { select: { ledgerEntries: true, children: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Build ledger entry filter
    const ledgerWhere: any = { accountId: params.id };

    if (startDate || endDate) {
      ledgerWhere.transaction = { transactionDate: {} };
      if (startDate) ledgerWhere.transaction.transactionDate.gte = new Date(startDate);
      if (endDate) ledgerWhere.transaction.transactionDate.lte = new Date(endDate);
    }

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: ledgerWhere,
      include: {
        transaction: {
          select: {
            id: true,
            transactionDate: true,
            transactionNumber: true,
            description: true,
            transactionType: true,
          },
        },
      },
      orderBy: [
        { transaction: { transactionDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = ledgerEntries.map((entry) => {
      const amount = Number(entry.amount);
      if (entry.entryType === 'DEBIT') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      return {
        ...entry,
        amount,
        amountInBase: Number(entry.amountInBase),
        balance: runningBalance,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        account: {
          ...account,
          balance: Number(account.balance),
          foreignBalance: account.foreignBalance ? Number(account.foreignBalance) : null,
          children: account.children.map((c) => ({
            ...c,
            balance: Number(c.balance),
          })),
        },
        ledgerEntries: entriesWithBalance,
      },
    });
  } catch (error: any) {
    console.error('Error fetching account:', error);
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

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

    // Check if account exists
    const existingAccount = await prisma.chartOfAccount.findFirst({
      where: { id: params.id, organizationId },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // ── System account protection ──
    if (existingAccount.isSystem) {
      // Cannot change account type on system accounts
      if (data.accountType !== existingAccount.accountType) {
        return NextResponse.json(
          { error: 'Cannot change the account type of a system account' },
          { status: 400 }
        );
      }
      // Cannot change code on system accounts
      if (data.code !== existingAccount.code) {
        return NextResponse.json(
          { error: 'Cannot change the code of a system account' },
          { status: 400 }
        );
      }
    }

    // Check unique code (only if code changed)
    if (data.code !== existingAccount.code) {
      const codeExists = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId,
          code: data.code,
          NOT: { id: params.id },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: `Account code "${data.code}" already exists` },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {
      code: data.code,
      name: data.name,
      accountType: data.accountType,
      accountSubType: data.accountSubType || null,
      description: data.description || null,
      currency: data.currency,
    };

    // Allow toggling active status (but not for system accounts if they have entries)
    if (body.isActive !== undefined) {
      if (existingAccount.isSystem && body.isActive === false) {
        return NextResponse.json(
          { error: 'Cannot deactivate a system account' },
          { status: 400 }
        );
      }
      updateData.isActive = body.isActive;
    }

    // Allow toggling allowManualJournal
    if (body.allowManualJournal !== undefined) {
      updateData.allowManualJournal = body.allowManualJournal;
    }

    const account = await prisma.chartOfAccount.update({
      where: { id: params.id },
      data: updateData,
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
    console.error('Error updating account:', error);
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const account = await prisma.chartOfAccount.findFirst({
      where: { id: params.id, organizationId },
      include: {
        _count: { select: { ledgerEntries: true, children: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // ── System account protection ──
    if (account.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete a system account. System accounts are protected and required for core functionality.' },
        { status: 400 }
      );
    }

    // Cannot delete parent with children
    if (account._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with child accounts. Remove or reassign children first.' },
        { status: 400 }
      );
    }

    // Cannot delete account with transactions
    if (account._count.ledgerEntries > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing transactions. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await prisma.chartOfAccount.delete({ where: { id: params.id } });

    // If parent now has no children, update hasChildren flag
    if (account.parentId) {
      const siblingCount = await prisma.chartOfAccount.count({
        where: { parentId: account.parentId },
      });
      if (siblingCount === 0) {
        await prisma.chartOfAccount.update({
          where: { id: account.parentId },
          data: { hasChildren: false },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
