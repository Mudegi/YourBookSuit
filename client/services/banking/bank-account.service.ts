import { PrismaClient } from '@prisma/client';
import { DoubleEntryService } from '../accounting/double-entry.service';

const prisma = new PrismaClient();
const doubleEntryService = new DoubleEntryService();

export interface CreateBankAccountInput {
  organizationId: string;
  accountId: string; // Chart of Accounts ID (must be ASSET type)
  bankName: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'MONEY_MARKET' | 'CREDIT_CARD' | 'OTHER';
  routingNumber?: string;
  currency?: string;
  isActive?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountNumber?: string;
  accountType?: 'CHECKING' | 'SAVINGS' | 'MONEY_MARKET' | 'CREDIT_CARD' | 'OTHER';
  routingNumber?: string;
  currency?: string;
  isActive?: boolean;
}

export interface BankTransferInput {
  organizationId: string;
  fromAccountId: string; // Bank account ID (source)
  toAccountId: string; // Bank account ID (destination)
  amount: number;
  transferDate: Date;
  reference?: string;
  notes?: string;
  createdBy: string; // User ID
}

export class BankAccountService {
  /**
   * Create a new bank account
   */
  async createBankAccount(input: CreateBankAccountInput) {
    // Validate the chart of accounts account exists and is ASSET type
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: input.accountId },
    });

    if (!account) {
      throw new Error('Chart of Accounts account not found');
    }

    if (account.organizationId !== input.organizationId) {
      throw new Error('Account does not belong to this organization');
    }

    if (account.accountType !== 'ASSET') {
      throw new Error('Bank account must be linked to an ASSET account');
    }

    // Check if account is already linked to another bank account
    const existingBankAccount = await prisma.bankAccount.findFirst({
      where: {
        glAccountId: input.accountId,
        organizationId: input.organizationId,
      },
    });

    if (existingBankAccount) {
      throw new Error('This chart of accounts account is already linked to a bank account');
    }

    // Validate account number uniqueness within organization
    const duplicateAccountNumber = await prisma.bankAccount.findFirst({
      where: {
        organizationId: input.organizationId,
        accountNumber: input.accountNumber,
        bankName: input.bankName,
      },
    });

    if (duplicateAccountNumber) {
      throw new Error('A bank account with this account number already exists at this bank');
    }

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: input.organizationId,
        glAccountId: input.accountId,
        accountName: account.accountName,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountType: input.accountType,
        routingNumber: input.routingNumber || null,
        currency: input.currency || 'USD',
        currentBalance: 0, // Will be calculated from ledger entries
        openingBalance: 0,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    });

    return bankAccount;
  }

  /**
   * Update an existing bank account
   */
  async updateBankAccount(id: string, organizationId: string, input: UpdateBankAccountInput) {
    // Verify bank account exists and belongs to organization
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (bankAccount.organizationId !== organizationId) {
      throw new Error('Bank account does not belong to this organization');
    }

    // If updating account number, check for duplicates
    if (input.accountNumber || input.bankName) {
      const accountNumber = input.accountNumber || bankAccount.accountNumber;
      const bankName = input.bankName || bankAccount.bankName;

      const duplicateAccountNumber = await prisma.bankAccount.findFirst({
        where: {
          organizationId,
          accountNumber,
          bankName,
          id: { not: id },
        },
      });

      if (duplicateAccountNumber) {
        throw new Error('A bank account with this account number already exists at this bank');
      }
    }

    // Update bank account
    const updatedBankAccount = await prisma.bankAccount.update({
      where: { id },
      data: input,
    });

    return updatedBankAccount;
  }

  /**
   * Delete a bank account
   */
  async deleteBankAccount(id: string, organizationId: string) {
    // Verify bank account exists and belongs to organization
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (bankAccount.organizationId !== organizationId) {
      throw new Error('Bank account does not belong to this organization');
    }

    // Prevent deletion if there are payments
    if (bankAccount.payments.length > 0) {
      throw new Error(
        'Cannot delete bank account with existing payments. Consider marking it as inactive instead.'
      );
    }

    // Delete bank account
    await prisma.bankAccount.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Get bank account balance from ledger entries
   */
  async getBankAccountBalance(accountId: string, asOfDate?: Date): Promise<number> {
    const whereClause: any = {
      accountId,
    };

    if (asOfDate) {
      whereClause.transaction = {
        transactionDate: {
          lte: asOfDate,
        },
        status: 'POSTED',
      };
    } else {
      whereClause.transaction = {
        status: 'POSTED',
      };
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: whereClause,
    });

    // For ASSET accounts: Debit increases, Credit decreases
    const balance = entries.reduce((sum, entry) => {
      return sum + entry.debit - entry.credit;
    }, 0);

    return balance;
  }

  /**
   * Transfer money between bank accounts
   * Creates a balanced GL transaction: DR: To Account, CR: From Account
   */
  async transferBetweenAccounts(input: BankTransferInput) {
    // Validate from account
    const fromBankAccount = await prisma.bankAccount.findUnique({
      where: { id: input.fromAccountId },
    });

    if (!fromBankAccount) {
      throw new Error('Source bank account not found');
    }

    if (fromBankAccount.organizationId !== input.organizationId) {
      throw new Error('Source bank account does not belong to this organization');
    }

    if (!fromBankAccount.isActive) {
      throw new Error('Source bank account is not active');
    }

    // Validate to account
    const toBankAccount = await prisma.bankAccount.findUnique({
      where: { id: input.toAccountId },
    });

    if (!toBankAccount) {
      throw new Error('Destination bank account not found');
    }

    if (toBankAccount.organizationId !== input.organizationId) {
      throw new Error('Destination bank account does not belong to this organization');
    }

    if (!toBankAccount.isActive) {
      throw new Error('Destination bank account is not active');
    }

    // Validate amount
    if (input.amount <= 0) {
      throw new Error('Transfer amount must be greater than zero');
    }

    // Cannot transfer to same account
    if (input.fromAccountId === input.toAccountId) {
      throw new Error('Cannot transfer to the same account');
    }

    // Check if from account has sufficient balance
    const fromBalance = await this.getBankAccountBalance(fromBankAccount.glAccountId);
    if (fromBalance < input.amount) {
      throw new Error(
        `Insufficient balance in source account. Available: ${fromBalance.toFixed(2)}, Required: ${input.amount.toFixed(2)}`
      );
    }

    // Create GL transaction entries
    // DR: To Account (increase destination bank account)
    // CR: From Account (decrease source bank account)
    const entries = [
      {
        accountId: toBankAccount.glAccountId,
        debit: input.amount,
        credit: 0,
        description: `Transfer from ${fromBankAccount.bankName} ${fromBankAccount.accountNumber}`,
      },
      {
        accountId: fromBankAccount.glAccountId,
        debit: 0,
        credit: input.amount,
        description: `Transfer to ${toBankAccount.bankName} ${toBankAccount.accountNumber}`,
      },
    ];

    // Create transaction
    const transaction = await doubleEntryService.createTransaction({
      organizationId: input.organizationId,
      transactionDate: input.transferDate,
      description: input.notes || `Bank transfer: ${fromBankAccount.bankName} → ${toBankAccount.bankName}`,
      reference: input.reference || `TRANSFER-${Date.now()}`,
      entries,
      createdBy: input.createdBy,
    });

    // Post the transaction
    await doubleEntryService.postTransaction(transaction.id);

    // Create bank transfer record
    const bankTransfer = await prisma.bankTransfer.create({
      data: {
        organizationId: input.organizationId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        transferDate: input.transferDate,
        transactionId: transaction.id,
        reference: input.reference || null,
        notes: input.notes || null,
      },
      include: {
        fromAccount: {
          include: { account: true },
        },
        toAccount: {
          include: { account: true },
        },
        transaction: {
          include: {
            entries: {
              include: { account: true },
            },
          },
        },
      },
    });

    // Update bank account balances
    await this.updateBankAccountBalance(input.fromAccountId);
    await this.updateBankAccountBalance(input.toAccountId);

    return bankTransfer;
  }

  /**
   * Update bank account current balance from ledger entries
   */
  async updateBankAccountBalance(bankAccountId: string) {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (!bankAccount.glAccountId) {
      // If no GL account is linked, set balance to 0
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: 0 },
      });
      return;
    }

    const balance = await this.getBankAccountBalance(bankAccount.glAccountId);

    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { currentBalance: balance },
    });

    return balance;
  }

  /**
   * Get all bank accounts for an organization
   */
  async getBankAccounts(organizationId: string, includeInactive = false) {
    const whereClause: any = { organizationId };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: whereClause,
      orderBy: [{ isActive: 'desc' }, { bankName: 'asc' }],
    });

    // Update balances for each account
    const accountsWithBalances = await Promise.all(
      bankAccounts.map(async (bankAcct) => {
        const balance = bankAcct.glAccountId 
          ? await this.getBankAccountBalance(bankAcct.glAccountId)
          : 0;
        return {
          ...bankAcct,
          currentBalance: balance,
        };
      })
    );

    return accountsWithBalances;
  }

  /**
   * Get a single bank account by ID
   */
  async getBankAccountById(id: string, organizationId: string) {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (bankAccount.organizationId !== organizationId) {
      throw new Error('Bank account does not belong to this organization');
    }

    // Get current balance
    const balance = await this.getBankAccountBalance(bankAccount.accountId);

    return {
      ...bankAccount,
      currentBalance: balance,
    };
  }

  /**
   * Get recent transactions for a bank account
   */
  async getBankAccountTransactions(
    bankAccountId: string,
    organizationId: string,
    limit = 50,
    startDate?: Date,
    endDate?: Date
  ) {
    const bankAccount = await this.getBankAccountById(bankAccountId, organizationId);

    const whereClause: any = {
      accountId: bankAccount.glAccountId,
      transaction: {
        status: 'POSTED',
      },
    };

    if (startDate || endDate) {
      whereClause.transaction.transactionDate = {};
      if (startDate) {
        whereClause.transaction.transactionDate.gte = startDate;
      }
      if (endDate) {
        whereClause.transaction.transactionDate.lte = endDate;
      }
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: whereClause,
      include: {
        transaction: true,
        account: true,
      },
      orderBy: {
        transaction: {
          transactionDate: 'desc',
        },
      },
      take: limit,
    });

    return entries;
  }
}
