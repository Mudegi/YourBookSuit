import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString();

    // Fetch all accounts
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      orderBy: [
        {
          accountType: 'asc',
        },
        {
          code: 'asc',
        },
      ],
    });

    // Calculate balance for each account up to the specified date
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        // Sum debits
        const debits = await prisma.ledgerEntry.aggregate({
          where: {
            accountId: account.id,
            entryType: 'DEBIT',
            transaction: {
              transactionDate: {
                lte: new Date(asOfDate),
              },
              status: 'POSTED',
            },
          },
          _sum: {
            amount: true,
          },
        });

        // Sum credits
        const credits = await prisma.ledgerEntry.aggregate({
          where: {
            accountId: account.id,
            entryType: 'CREDIT',
            transaction: {
              transactionDate: {
                lte: new Date(asOfDate),
              },
              status: 'POSTED',
            },
          },
          _sum: {
            amount: true,
          },
        });

        const totalDebits = Number(debits._sum.amount || 0);
        const totalCredits = Number(credits._sum.amount || 0);

        // Calculate balance based on account type
        let balance = 0;
        if (['ASSET', 'EXPENSE'].includes(account.accountType)) {
          // Debit balance accounts
          balance = totalDebits - totalCredits;
        } else {
          // Credit balance accounts (LIABILITY, EQUITY, REVENUE)
          balance = totalCredits - totalDebits;
        }

        return {
          id: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          debit: totalDebits,
          credit: totalCredits,
          balance: Math.abs(balance),
          balanceType: balance >= 0 ? 'normal' : 'abnormal',
        };
      })
    );

    // Group by account type
    const groupedAccounts = {
      ASSET: accountsWithBalances.filter((a) => a.accountType === 'ASSET'),
      LIABILITY: accountsWithBalances.filter((a) => a.accountType === 'LIABILITY'),
      EQUITY: accountsWithBalances.filter((a) => a.accountType === 'EQUITY'),
      REVENUE: accountsWithBalances.filter((a) => a.accountType === 'REVENUE'),
      EXPENSE: accountsWithBalances.filter((a) => a.accountType === 'EXPENSE'),
    };

    // Calculate totals
    const totalDebits = accountsWithBalances.reduce((sum, a) => sum + a.debit, 0);
    const totalCredits = accountsWithBalances.reduce((sum, a) => sum + a.credit, 0);

    const summary = {
      totalDebits,
      totalCredits,
      difference: Math.abs(totalDebits - totalCredits),
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01, // Allow for floating point precision
      asOfDate: new Date(asOfDate).toISOString(),
      accountCount: accountsWithBalances.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        accounts: groupedAccounts,
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    return NextResponse.json(
      { error: 'Failed to generate trial balance' },
      { status: 500 }
    );
  }
}
