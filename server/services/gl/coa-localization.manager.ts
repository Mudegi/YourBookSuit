/**
 * Chart of Accounts Localization Manager
 * 
 * Provides country-specific COA templates without hardcoding.
 * Supports GAAP, IFRS, and regional standards (Uganda - ICPASU, etc.)
 * 
 * Architecture: Strategy Pattern
 * - Templates are data-driven, not code-driven
 * - New countries add new templates, not new code
 */

import { AccountType } from '@prisma/client';

export interface COATemplate {
  code: string;
  name: string;
  accountType: AccountType;
  accountSubType: string;
  parentCode?: string;
  currency?: string;
  description?: string;
  isSystem: boolean;
  allowManualJournal: boolean;
  requiresDimension?: boolean;
  isBankAccount?: boolean;
  tags?: string[];
  level: number;
}

export interface COAStandard {
  country: string;
  standard: 'GAAP' | 'IFRS' | 'ICPASU' | 'MIXED';
  baseCurrency: string;
  templates: COATemplate[];
}

/**
 * COA Localization Manager
 * Returns country-specific COA templates
 */
export class COALocalizationManager {
  
  /**
   * Get standard COA for a country
   */
  static getStandardCOA(countryCode: string, baseCurrency: string): COAStandard {
    switch (countryCode) {
      case 'UG':
        return this.getUgandaCOA(baseCurrency);
      case 'KE':
        return this.getKenyaCOA(baseCurrency);
      case 'US':
        return this.getUSCOA(baseCurrency);
      case 'GB':
        return this.getUKCOA(baseCurrency);
      default:
        return this.getIFRSCOA(baseCurrency);
    }
  }

  /**
   * Uganda COA - ICPASU Compliant
   * Institute of Certified Public Accountants of Uganda
   */
  private static getUgandaCOA(baseCurrency: string): COAStandard {
    return {
      country: 'UG',
      standard: 'ICPASU',
      baseCurrency,
      templates: [
        // ASSETS (1000-1999)
        {
          code: '1000',
          name: 'Current Assets',
          accountType: 'ASSET',
          accountSubType: 'Current Assets',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
          description: 'Parent account for all current assets',
        },
        {
          code: '1010',
          name: 'Cash on Hand',
          accountType: 'ASSET',
          accountSubType: 'Cash',
          parentCode: '1000',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
          tags: ['cash', 'liquid'],
        },
        {
          code: '1020',
          name: 'Bank Account - UGX',
          accountType: 'ASSET',
          accountSubType: 'Bank',
          parentCode: '1000',
          currency: 'UGX',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
          isBankAccount: true,
          tags: ['bank', 'checking'],
        },
        {
          code: '1021',
          name: 'Bank Account - USD',
          accountType: 'ASSET',
          accountSubType: 'Bank',
          parentCode: '1000',
          currency: 'USD',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
          isBankAccount: true,
          tags: ['bank', 'foreign-currency'],
        },
        {
          code: '1100',
          name: 'Accounts Receivable',
          accountType: 'ASSET',
          accountSubType: 'Accounts Receivable',
          parentCode: '1000',
          level: 1,
          isSystem: true,
          allowManualJournal: false,
          description: 'System-controlled from invoices',
        },
        {
          code: '1200',
          name: 'Inventory',
          accountType: 'ASSET',
          accountSubType: 'Inventory',
          parentCode: '1000',
          level: 1,
          isSystem: true,
          allowManualJournal: false,
          description: 'System-controlled from stock movements',
        },
        {
          code: '1300',
          name: 'Prepaid Expenses',
          accountType: 'ASSET',
          accountSubType: 'Prepaid',
          parentCode: '1000',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
        },
        {
          code: '1500',
          name: 'Fixed Assets',
          accountType: 'ASSET',
          accountSubType: 'Fixed Assets',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '1510',
          name: 'Property & Buildings',
          accountType: 'ASSET',
          accountSubType: 'Fixed Assets',
          parentCode: '1500',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
        },
        {
          code: '1520',
          name: 'Accumulated Depreciation',
          accountType: 'ASSET',
          accountSubType: 'Accumulated Depreciation',
          parentCode: '1500',
          level: 1,
          isSystem: true,
          allowManualJournal: false,
        },

        // LIABILITIES (2000-2999)
        {
          code: '2000',
          name: 'Current Liabilities',
          accountType: 'LIABILITY',
          accountSubType: 'Current Liabilities',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '2010',
          name: 'Accounts Payable',
          accountType: 'LIABILITY',
          accountSubType: 'Accounts Payable',
          parentCode: '2000',
          level: 1,
          isSystem: true,
          allowManualJournal: false,
          description: 'System-controlled from bills',
        },
        {
          code: '2100',
          name: 'VAT Payable',
          accountType: 'LIABILITY',
          accountSubType: 'Tax Payable',
          parentCode: '2000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
          tags: ['tax', 'ura', 'vat'],
        },
        {
          code: '2110',
          name: 'VAT Input (Reclaimable)',
          accountType: 'ASSET',
          accountSubType: 'Tax Receivable',
          parentCode: '1000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
          tags: ['tax', 'ura', 'vat'],
        },
        {
          code: '2120',
          name: 'Withholding Tax Payable',
          accountType: 'LIABILITY',
          accountSubType: 'Tax Payable',
          parentCode: '2000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
          tags: ['tax', 'ura', 'wht'],
        },
        {
          code: '2200',
          name: 'PAYE Payable',
          accountType: 'LIABILITY',
          accountSubType: 'Tax Payable',
          parentCode: '2000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
          tags: ['tax', 'ura', 'payroll'],
        },
        {
          code: '2300',
          name: 'NSSF Payable',
          accountType: 'LIABILITY',
          accountSubType: 'Statutory Payable',
          parentCode: '2000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
          tags: ['statutory', 'nssf', 'payroll'],
        },

        // EQUITY (3000-3999)
        {
          code: '3000',
          name: 'Equity',
          accountType: 'EQUITY',
          accountSubType: 'Equity',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '3010',
          name: 'Share Capital',
          accountType: 'EQUITY',
          accountSubType: 'Capital',
          parentCode: '3000',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
        },
        {
          code: '3100',
          name: 'Retained Earnings',
          accountType: 'EQUITY',
          accountSubType: 'Retained Earnings',
          parentCode: '3000',
          level: 1,
          isSystem: true,
          allowManualJournal: false,
        },

        // REVENUE (4000-4999)
        {
          code: '4000',
          name: 'Revenue',
          accountType: 'REVENUE',
          accountSubType: 'Revenue',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '4010',
          name: 'Sales Revenue',
          accountType: 'REVENUE',
          accountSubType: 'Sales',
          parentCode: '4000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
          description: 'System-controlled from invoices',
        },
        {
          code: '4020',
          name: 'Service Revenue',
          accountType: 'REVENUE',
          accountSubType: 'Services',
          parentCode: '4000',
          level: 1,
          isSystem: false,
          allowManualJournal: false,
        },

        // EXPENSES (5000-9999)
        {
          code: '5000',
          name: 'Cost of Goods Sold',
          accountType: 'EXPENSE',
          accountSubType: 'Cost of Sales',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '5010',
          name: 'COGS - Inventory',
          accountType: 'EXPENSE',
          accountSubType: 'Cost of Sales',
          parentCode: '5000',
          level: 1,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '6000',
          name: 'Operating Expenses',
          accountType: 'EXPENSE',
          accountSubType: 'Operating Expense',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        {
          code: '6100',
          name: 'Salaries & Wages',
          accountType: 'EXPENSE',
          accountSubType: 'Payroll',
          parentCode: '6000',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
        },
        {
          code: '6200',
          name: 'Rent Expense',
          accountType: 'EXPENSE',
          accountSubType: 'Occupancy',
          parentCode: '6000',
          level: 1,
          isSystem: false,
          allowManualJournal: true,
        },
      ],
    };
  }

  /**
   * US COA - GAAP Compliant
   */
  private static getUSCOA(baseCurrency: string): COAStandard {
    return {
      country: 'US',
      standard: 'GAAP',
      baseCurrency,
      templates: [
        // Similar structure but GAAP-specific accounts
        {
          code: '1000',
          name: 'Assets',
          accountType: 'ASSET',
          accountSubType: 'Assets',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        // ... abbreviated for brevity
      ],
    };
  }

  /**
   * IFRS COA - International Standard (Default)
   */
  private static getIFRSCOA(baseCurrency: string): COAStandard {
    return {
      country: 'INTL',
      standard: 'IFRS',
      baseCurrency,
      templates: [
        // IFRS-compliant structure
        {
          code: '1000',
          name: 'Non-Current Assets',
          accountType: 'ASSET',
          accountSubType: 'Non-Current Assets',
          level: 0,
          isSystem: true,
          allowManualJournal: false,
        },
        // ... IFRS structure
      ],
    };
  }

  /**
   * Kenya COA - IFRS with KRA compliance
   */
  private static getKenyaCOA(baseCurrency: string): COAStandard {
    return {
      country: 'KE',
      standard: 'IFRS',
      baseCurrency,
      templates: [
        // Kenya-specific with KRA tax accounts
      ],
    };
  }

  /**
   * UK COA - IFRS/GAAP hybrid
   */
  private static getUKCOA(baseCurrency: string): COAStandard {
    return {
      country: 'GB',
      standard: 'IFRS',
      baseCurrency,
      templates: [
        // UK-specific
      ],
    };
  }

  /**
   * Validate account code follows standard structure
   */
  static validateAccountCode(code: string, accountType: AccountType): boolean {
    const codeNum = parseInt(code);
    
    switch (accountType) {
      case 'ASSET':
        return codeNum >= 1000 && codeNum < 2000;
      case 'LIABILITY':
        return codeNum >= 2000 && codeNum < 3000;
      case 'EQUITY':
        return codeNum >= 3000 && codeNum < 4000;
      case 'REVENUE':
        return codeNum >= 4000 && codeNum < 5000;
      case 'EXPENSE':
        return codeNum >= 5000 && codeNum < 10000;
      default:
        return false;
    }
  }

  /**
   * Get account type from code
   */
  static getAccountTypeFromCode(code: string): AccountType | null {
    const codeNum = parseInt(code);
    
    if (codeNum >= 1000 && codeNum < 2000) return 'ASSET';
    if (codeNum >= 2000 && codeNum < 3000) return 'LIABILITY';
    if (codeNum >= 3000 && codeNum < 4000) return 'EQUITY';
    if (codeNum >= 4000 && codeNum < 5000) return 'REVENUE';
    if (codeNum >= 5000 && codeNum < 10000) return 'EXPENSE';
    
    return null;
  }
}

export default COALocalizationManager;
