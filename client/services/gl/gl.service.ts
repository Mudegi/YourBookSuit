/**
 * General Ledger Service
 * 
 * Country-blind, hierarchical COA management with multi-currency support.
 * Enforces financial integrity through parent/child roll-ups and posting controls.
 */

import { PrismaClient, AccountType, Prisma } from '@prisma/client';
import { COALocalizationManager } from './coa-localization.manager';

export interface CreateAccountInput {
  code: string;
  name: string;
  accountType: AccountType;
  accountSubType?: string;
  parentId?: string;
  currency?: string;
  description?: string;
  allowManualJournal?: boolean;
  requiresDimension?: boolean;
  isBankAccount?: boolean;
  tags?: string[];
}

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  balance: number;
  foreignBalance?: number;
  currency: string;
  children?: AccountBalance[];
}

export interface AccountHierarchy {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  balance: number;
  level: number;
  hasChildren: boolean;
  isExpanded?: boolean;
  children?: AccountHierarchy[];
}

export class GLService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Initialize COA for new organization using localization
   */
  async initializeCOA(
    organizationId: string,
    countryCode: string,
    baseCurrency: string
  ): Promise<{ success: boolean; accountsCreated: number }> {
    
    const coaStandard = COALocalizationManager.getStandardCOA(countryCode, baseCurrency);
    
    return this.prisma.$transaction(async (tx) => {
      let accountsCreated = 0;
      const accountMap = new Map<string, string>(); // code -> id mapping

      // Sort templates by level to ensure parents are created first
      const sortedTemplates = [...coaStandard.templates].sort((a, b) => a.level - b.level);

      for (const template of sortedTemplates) {
        let parentId: string | undefined;
        
        if (template.parentCode) {
          parentId = accountMap.get(template.parentCode);
          if (!parentId) {
            throw new Error(`Parent account ${template.parentCode} not found for ${template.code}`);
          }
        }

        const account = await tx.chartOfAccount.create({
          data: {
            organizationId,
            code: template.code,
            name: template.name,
            accountType: template.accountType,
            accountSubType: template.accountSubType,
            parentId,
            currency: template.currency || baseCurrency,
            description: template.description,
            isSystem: template.isSystem,
            allowManualJournal: template.allowManualJournal,
            requiresDimension: template.requiresDimension || false,
            isBankAccount: template.isBankAccount || false,
            level: template.level,
            hasChildren: false,
            tags: template.tags || [],
            isActive: true,
            balance: 0,
          },
        });

        accountMap.set(template.code, account.id);
        accountsCreated++;

        // Update parent's hasChildren flag
        if (parentId) {
          await tx.chartOfAccount.update({
            where: { id: parentId },
            data: { hasChildren: true },
          });
        }
      }

      return { success: true, accountsCreated };
    });
  }

  /**
   * Create a new account with hierarchy validation
   */
  async createAccount(
    organizationId: string,
    data: CreateAccountInput
  ): Promise<any> {
    
    // Validate account code structure
    if (!COALocalizationManager.validateAccountCode(data.code, data.accountType)) {
      throw new Error(`Account code ${data.code} is not valid for type ${data.accountType}`);
    }

    // Get organization settings for currency validation
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const currency = data.currency || org.baseCurrency;

    return this.prisma.$transaction(async (tx) => {
      let level = 0;
      let parentPath = '';

      // If parent specified, get its level and validate
      if (data.parentId) {
        const parent = await tx.chartOfAccount.findFirst({
          where: { id: data.parentId, organizationId },
        });

        if (!parent) {
          throw new Error('Parent account not found');
        }

        // Validate parent-child type compatibility
        if (parent.accountType !== data.accountType) {
          throw new Error('Parent and child accounts must be of the same type');
        }

        level = parent.level + 1;
        parentPath = parent.fullPath || parent.code;

        // Update parent's hasChildren flag
        await tx.chartOfAccount.update({
          where: { id: data.parentId },
          data: { hasChildren: true },
        });
      }

      const fullPath = parentPath ? `${parentPath}/${data.code}` : data.code;

      const account = await tx.chartOfAccount.create({
        data: {
          organizationId,
          code: data.code,
          name: data.name,
          accountType: data.accountType,
          accountSubType: data.accountSubType,
          parentId: data.parentId,
          currency,
          description: data.description,
          allowManualJournal: data.allowManualJournal !== false,
          requiresDimension: data.requiresDimension || false,
          isBankAccount: data.isBankAccount || false,
          level,
          fullPath,
          tags: data.tags || [],
          isActive: true,
          balance: 0,
        },
        include: {
          parent: true,
          children: true,
        },
      });

      return account;
    });
  }

  /**
   * Get account hierarchy tree
   */
  async getAccountHierarchy(
    organizationId: string,
    options: {
      accountType?: AccountType;
      includeInactive?: boolean;
      maxDepth?: number;
    } = {}
  ): Promise<AccountHierarchy[]> {
    
    const where: Prisma.ChartOfAccountWhereInput = {
      organizationId,
      ...(options.accountType && { accountType: options.accountType }),
      ...(!options.includeInactive && { isActive: true }),
    };

    const allAccounts = await this.prisma.chartOfAccount.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        parentId: true,
        balance: true,
        level: true,
        hasChildren: true,
        isActive: true,
      },
    });

    // Build tree structure
    const accountMap = new Map<string, AccountHierarchy>();
    const rootAccounts: AccountHierarchy[] = [];

    // First pass: create map of all accounts
    allAccounts.forEach((account) => {
      accountMap.set(account.id, {
        ...account,
        balance: account.balance.toNumber(),
        children: [],
        isExpanded: false,
      });
    });

    // Second pass: build parent-child relationships
    allAccounts.forEach((account) => {
      const node = accountMap.get(account.id)!;
      
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        rootAccounts.push(node);
      }
    });

    return rootAccounts;
  }

  /**
   * Calculate hierarchical balance roll-up
   * Parent accounts show sum of all children
   */
  async calculateHierarchicalBalances(
    organizationId: string,
    asOfDate?: Date
  ): Promise<AccountBalance[]> {
    
    // Get all accounts with their ledger entries
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true },
      include: {
        ledgerEntries: {
          where: {
            ...(asOfDate && {
              transaction: {
                transactionDate: { lte: asOfDate },
              },
            }),
          },
          select: {
            entryType: true,
            amount: true,
            currency: true,
            amountInBase: true,
          },
        },
        children: {
          select: { id: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const balanceMap = new Map<string, AccountBalance>();

    // Calculate individual balances
    accounts.forEach((account) => {
      let balance = 0;
      let foreignBalance: number | undefined;

      account.ledgerEntries.forEach((entry) => {
        const amount = entry.amountInBase.toNumber();
        if (entry.entryType === 'DEBIT') {
          balance += amount;
        } else {
          balance -= amount;
        }

        // Track foreign currency balance if applicable
        if (entry.currency !== account.currency) {
          foreignBalance = (foreignBalance || 0) + entry.amount.toNumber();
        }
      });

      balanceMap.set(account.id, {
        accountId: account.id,
        code: account.code,
        name: account.name,
        balance,
        foreignBalance,
        currency: account.currency,
      });
    });

    // Roll up balances from children to parents
    const processedAccounts = new Set<string>();
    
    const rollUpBalance = (accountId: string): number => {
      if (processedAccounts.has(accountId)) {
        return balanceMap.get(accountId)?.balance || 0;
      }

      const account = accounts.find(a => a.id === accountId);
      if (!account) return 0;

      let totalBalance = balanceMap.get(accountId)?.balance || 0;

      // Add children balances
      if (account.children && account.children.length > 0) {
        account.children.forEach((child) => {
          totalBalance += rollUpBalance(child.id);
        });
      }

      // Update balance map
      const accountBalance = balanceMap.get(accountId)!;
      accountBalance.balance = totalBalance;

      processedAccounts.add(accountId);
      return totalBalance;
    };

    // Start roll-up from root accounts
    accounts.filter(a => !a.parentId).forEach(account => {
      rollUpBalance(account.id);
    });

    return Array.from(balanceMap.values());
  }

  /**
   * Validate posting to an account
   */
  async validatePosting(
    organizationId: string,
    accountId: string,
    isManualEntry: boolean
  ): Promise<{ valid: boolean; errors: string[] }> {
    
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    const errors: string[] = [];

    if (!account) {
      errors.push('Account not found');
      return { valid: false, errors };
    }

    if (!account.isActive) {
      errors.push('Cannot post to inactive account');
    }

    if (isManualEntry && !account.allowManualJournal) {
      errors.push(`Account "${account.name}" does not allow manual journal entries. It is system-controlled.`);
    }

    if (account.hasChildren) {
      errors.push('Cannot post directly to parent accounts. Post to child accounts only.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get account by code
   */
  async getAccountByCode(
    organizationId: string,
    code: string
  ): Promise<any | null> {
    return this.prisma.chartOfAccount.findFirst({
      where: { organizationId, code },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Update account balance (called after ledger entries)
   */
  async updateAccountBalance(
    accountId: string,
    amount: number,
    isDebit: boolean
  ): Promise<void> {
    
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const currentBalance = account.balance.toNumber();
    const delta = isDebit ? amount : -amount;
    const newBalance = currentBalance + delta;

    await this.prisma.chartOfAccount.update({
      where: { id: accountId },
      data: { balance: newBalance },
    });
  }

  /**
   * Search accounts with filtering
   */
  async searchAccounts(
    organizationId: string,
    searchTerm: string,
    filters: {
      accountType?: AccountType;
      currency?: string;
      isActive?: boolean;
      allowManualJournal?: boolean;
    } = {}
  ): Promise<any[]> {
    
    const where: Prisma.ChartOfAccountWhereInput = {
      organizationId,
      ...(filters.accountType && { accountType: filters.accountType }),
      ...(filters.currency && { currency: filters.currency }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.allowManualJournal !== undefined && { 
        allowManualJournal: filters.allowManualJournal 
      }),
      ...(searchTerm && {
        OR: [
          { code: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.chartOfAccount.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        parent: { select: { code: true, name: true } },
        _count: {
          select: { children: true, ledgerEntries: true },
        },
      },
    });
  }
}

export default GLService;
