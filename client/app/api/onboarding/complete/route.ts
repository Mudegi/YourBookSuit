import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

export async function POST(request: NextRequest) {
  try {
    // Get current user from token
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { bankName, accountNumber, openingBalance } = body;

    // Validation
    if (!bankName || !accountNumber) {
      return NextResponse.json(
        { error: 'Bank name and account number are required' },
        { status: 400 }
      );
    }

    if (openingBalance < 0) {
      return NextResponse.json(
        { error: 'Opening balance cannot be negative' },
        { status: 400 }
      );
    }

    // Get user's organization
    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organizationId;
    const organization = userOrg.organization;

    // Get or create Cash account from Chart of Accounts
    let cashAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: '1000', // Cash and Cash Equivalents
      },
    });

    if (!cashAccount) {
      // Create default cash account if it doesn't exist
      cashAccount = await prisma.chartOfAccount.create({
        data: {
          organizationId,
          code: '1000',
          name: 'Cash and Cash Equivalents',
          accountType: 'ASSET',
          accountSubType: 'Current Assets',
          isActive: true,
        },
      });
    }

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId,
        accountName: bankName,
        accountNumber,
        bankName,
        accountType: 'CHECKING',
        currency: organization.baseCurrency || 'USD',
        currentBalance: openingBalance,
        isActive: true,
      },
    });

    // If there's an opening balance, create proper double-entry journal entry
    if (openingBalance > 0) {
      // Check if opening balance entry already exists for this organization
      const existingOpeningBalance = await prisma.transaction.findFirst({
        where: {
          organizationId,
          description: {
            contains: 'Opening balance',
          },
        },
      });

      // Only create opening balance if one doesn't already exist
      if (!existingOpeningBalance) {
        const ownerCapitalAccountId = await getOwnerCapitalAccountId(organizationId);
        
        // Create opening balance journal entry with proper double-entry bookkeeping
        // Debit: Cash (Asset increases)
        // Credit: Owner's Capital (Equity increases)
        await DoubleEntryService.createTransaction({
          organizationId,
          transactionDate: new Date(),
          transactionType: 'JOURNAL_ENTRY',
          description: `Opening balance for ${bankName}`,
          entries: [
            {
              accountId: cashAccount.id,
              entryType: 'DEBIT',
              amount: openingBalance,
              description: `Opening balance - ${bankName}`,
            },
            {
              accountId: ownerCapitalAccountId,
              entryType: 'CREDIT',
              amount: openingBalance,
              description: `Owner capital contribution - ${bankName}`,
            },
          ],
          createdById: userId,
        });
      }
    }

    // Mark onboarding as complete
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        organization: updatedOrg,
        bankAccount,
      },
    });
  } catch (error: any) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get or create Owner's Capital account
async function getOwnerCapitalAccountId(organizationId: string): Promise<string> {
  let capitalAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      code: '3000',
    },
  });

  if (!capitalAccount) {
    capitalAccount = await prisma.chartOfAccount.create({
      data: {
        organizationId,
        code: '3000',
        name: "Owner's Capital",
        accountType: 'EQUITY',
        accountSubType: 'Equity',
        isActive: true,
        balance: 0,
      },
    });
  }

  return capitalAccount.id;
}
