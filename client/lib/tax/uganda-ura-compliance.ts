/**
 * Uganda URA Tax Compliance Pack
 * 
 * Implements Uganda Revenue Authority (URA) tax requirements:
 * - VAT: 18% standard, 0% zero-rated, exempt
 * - WHT: 6% professional services, various rates for other categories
 * - PAYE: Tiered income tax (0%, 10%, 20%, 30%, 40%)
 * - Input Tax Credit restrictions (requires EFRIS e-receipt)
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Uganda Tax Rates (Effective 2024/2025)
export const UGANDA_VAT_RATES = {
  STANDARD: 18.00,
  ZERO_RATED: 0.00,
  EXEMPT: 0.00,
};

export const UGANDA_WHT_RATES = {
  PROFESSIONAL_SERVICES: 6.00,
  MANAGEMENT_FEES: 15.00,
  RENT: 6.00,
  DIVIDENDS: 15.00,
  INTEREST: 15.00,
  ROYALTIES: 15.00,
  COMMISSION: 10.00,
  CONTRACTORS: 6.00,
  IMPORTED_SERVICES: 15.00,
};

// Uganda PAYE Tax Brackets (Monthly - 2024/2025)
export const UGANDA_PAYE_BRACKETS = [
  { min: 0, max: 235000, rate: 0 },
  { min: 235001, max: 335000, rate: 10 },
  { min: 335001, max: 410000, rate: 20 },
  { min: 410001, max: 10000000, rate: 30 },
  { min: 10000001, max: Infinity, rate: 40 },
];

// WHT Thresholds (UGX)
export const UGANDA_WHT_THRESHOLDS = {
  PROFESSIONAL_SERVICES: 1000000, // UGX 1M
  RENT: 500000, // UGX 500K
  DEFAULT: 0,
};

/**
 * Initialize Uganda URA tax compliance pack for an organization
 */
export async function initializeUgandaURAPack(organizationId: string) {
  console.log(`Initializing Uganda URA compliance pack for org: ${organizationId}`);

  try {
    // 1. Update organization settings
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        homeCountry: 'UG',
        compliancePack: 'UG_URA',
        baseCurrency: 'UGX',
      },
    });

    // 2. Create VAT Tax Rates
    const vatRates = await Promise.all([
      // Standard VAT 18%
      prisma.taxRate.create({
        data: {
          organizationId,
          name: 'Standard VAT',
          taxType: 'VAT',
          rate: new Prisma.Decimal(UGANDA_VAT_RATES.STANDARD),
          country: 'UG',
          isDefault: true,
          isActive: true,
          effectiveFrom: new Date('2024-01-01'),
          description: 'Uganda Standard VAT Rate - 18%',
          taxCode: 'T-18',
          claimable: true,
          requiresEFRIS: true, // Input tax credit requires EFRIS e-receipt
        },
      }),

      // Zero-rated VAT (Exports, basic goods)
      prisma.taxRate.create({
        data: {
          organizationId,
          name: 'Zero-rated VAT',
          taxType: 'VAT',
          rate: new Prisma.Decimal(UGANDA_VAT_RATES.ZERO_RATED),
          country: 'UG',
          isDefault: false,
          isActive: true,
          effectiveFrom: new Date('2024-01-01'),
          description: 'Zero-rated supplies: exports, basic food items, medical supplies',
          taxCode: 'T-0',
          claimable: true,
          requiresEFRIS: true,
        },
      }),

      // Exempt VAT (Financial services, education)
      prisma.taxRate.create({
        data: {
          organizationId,
          name: 'Exempt VAT',
          taxType: 'VAT',
          rate: new Prisma.Decimal(UGANDA_VAT_RATES.EXEMPT),
          country: 'UG',
          isDefault: false,
          isActive: true,
          effectiveFrom: new Date('2024-01-01'),
          description: 'Exempt supplies: financial services, education, residential rent',
          taxCode: 'EXEMPT',
          claimable: false, // Cannot claim input tax on exempt supplies
          requiresEFRIS: false,
        },
      }),
    ]);

    console.log(`Created ${vatRates.length} VAT rates`);

    // 3. Create WHT Rules
    const whtRules = await Promise.all([
      // Professional Services WHT - 6%
      prisma.wHTRule.create({
        data: {
          organizationId,
          name: 'Professional Services WHT',
          country: 'UG',
          whtType: 'PROFESSIONAL_SERVICES',
          rate: new Prisma.Decimal(UGANDA_WHT_RATES.PROFESSIONAL_SERVICES),
          threshold: new Prisma.Decimal(UGANDA_WHT_THRESHOLDS.PROFESSIONAL_SERVICES),
          isActive: true,
          description: 'Withholding tax on professional services (legal, accounting, consulting, engineering)',
          effectiveFrom: new Date('2024-01-01'),
          serviceCategories: ['PROFESSIONAL', 'CONSULTING', 'LEGAL', 'ACCOUNTING', 'ENGINEERING', 'AUDIT'],
        },
      }),

      // Rent WHT - 6%
      prisma.wHTRule.create({
        data: {
          organizationId,
          name: 'Rent WHT',
          country: 'UG',
          whtType: 'RENT',
          rate: new Prisma.Decimal(UGANDA_WHT_RATES.RENT),
          threshold: new Prisma.Decimal(UGANDA_WHT_THRESHOLDS.RENT),
          isActive: true,
          description: 'Withholding tax on commercial rent',
          effectiveFrom: new Date('2024-01-01'),
          serviceCategories: ['RENT', 'LEASE'],
        },
      }),

      // Management Fees WHT - 15%
      prisma.wHTRule.create({
        data: {
          organizationId,
          name: 'Management Fees WHT',
          country: 'UG',
          whtType: 'MANAGEMENT_FEES',
          rate: new Prisma.Decimal(UGANDA_WHT_RATES.MANAGEMENT_FEES),
          threshold: new Prisma.Decimal(0),
          isActive: true,
          description: 'Withholding tax on management fees',
          effectiveFrom: new Date('2024-01-01'),
          serviceCategories: ['MANAGEMENT'],
        },
      }),

      // Interest WHT - 15%
      prisma.wHTRule.create({
        data: {
          organizationId,
          name: 'Interest WHT',
          country: 'UG',
          whtType: 'INTEREST',
          rate: new Prisma.Decimal(UGANDA_WHT_RATES.INTEREST),
          threshold: new Prisma.Decimal(0),
          isActive: true,
          description: 'Withholding tax on interest payments',
          effectiveFrom: new Date('2024-01-01'),
          serviceCategories: ['INTEREST'],
        },
      }),

      // Contractors WHT - 6%
      prisma.wHTRule.create({
        data: {
          organizationId,
          name: 'Contractors WHT',
          country: 'UG',
          whtType: 'CONTRACTORS',
          rate: new Prisma.Decimal(UGANDA_WHT_RATES.CONTRACTORS),
          threshold: new Prisma.Decimal(UGANDA_WHT_THRESHOLDS.DEFAULT),
          isActive: true,
          description: 'Withholding tax on contractor payments',
          effectiveFrom: new Date('2024-01-01'),
          serviceCategories: ['CONTRACTOR', 'CONSTRUCTION'],
        },
      }),
    ]);

    console.log(`Created ${whtRules.length} WHT rules`);

    return {
      success: true,
      message: 'Uganda URA compliance pack initialized successfully',
      data: {
        vatRates: vatRates.length,
        whtRules: whtRules.length,
      },
    };
  } catch (error) {
    console.error('Error initializing Uganda URA pack:', error);
    throw error;
  }
}

/**
 * Calculate VAT for Uganda
 */
export function calculateUgandaVAT(
  amount: number,
  taxCategory: 'STANDARD' | 'ZERO_RATED' | 'EXEMPT'
): { netAmount: number; vatAmount: number; grossAmount: number } {
  const rate = UGANDA_VAT_RATES[taxCategory];
  const vatAmount = (amount * rate) / 100;
  return {
    netAmount: amount,
    vatAmount: vatAmount,
    grossAmount: amount + vatAmount,
  };
}

/**
 * Calculate WHT for Uganda
 */
export function calculateUgandaWHT(
  grossAmount: number,
  whtType: keyof typeof UGANDA_WHT_RATES,
  applyThreshold: boolean = true
): { grossAmount: number; whtAmount: number; netAmount: number; whtApplicable: boolean } {
  const rate = UGANDA_WHT_RATES[whtType];
  const threshold = UGANDA_WHT_THRESHOLDS[whtType] || UGANDA_WHT_THRESHOLDS.DEFAULT;

  // Check if amount exceeds threshold
  const whtApplicable = !applyThreshold || grossAmount >= threshold;

  if (!whtApplicable) {
    return {
      grossAmount,
      whtAmount: 0,
      netAmount: grossAmount,
      whtApplicable: false,
    };
  }

  const whtAmount = (grossAmount * rate) / 100;
  return {
    grossAmount,
    whtAmount,
    netAmount: grossAmount - whtAmount,
    whtApplicable: true,
  };
}

/**
 * Calculate PAYE for Uganda (Monthly)
 */
export function calculateUgandaPAYE(monthlyGross: number): {
  grossSalary: number;
  taxableIncome: number;
  paye: number;
  netSalary: number;
  breakdown: Array<{ bracket: string; amount: number; rate: number; tax: number }>;
} {
  let remainingIncome = monthlyGross;
  let totalTax = 0;
  const breakdown: Array<{ bracket: string; amount: number; rate: number; tax: number }> = [];

  for (const bracket of UGANDA_PAYE_BRACKETS) {
    if (remainingIncome <= 0) break;

    const bracketMax = bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingIncome, bracketMax);
    const taxInBracket = (taxableInBracket * bracket.rate) / 100;

    breakdown.push({
      bracket: `UGX ${bracket.min.toLocaleString()} - ${
        bracket.max === Infinity ? 'Above' : bracket.max.toLocaleString()
      }`,
      amount: taxableInBracket,
      rate: bracket.rate,
      tax: taxInBracket,
    });

    totalTax += taxInBracket;
    remainingIncome -= taxableInBracket;
  }

  return {
    grossSalary: monthlyGross,
    taxableIncome: monthlyGross,
    paye: totalTax,
    netSalary: monthlyGross - totalTax,
    breakdown,
  };
}

/**
 * Check if invoice qualifies for Input Tax Credit
 * Uganda: Requires valid EFRIS e-receipt
 */
export function canClaimInputTaxCredit(
  efrisReceiptNo: string | null | undefined,
  taxCategory: string
): { canClaim: boolean; reason?: string } {
  // Exempt supplies cannot claim input tax
  if (taxCategory === 'VAT_EXEMPT') {
    return {
      canClaim: false,
      reason: 'Exempt supplies cannot claim input tax credit',
    };
  }

  // Standard and Zero-rated require EFRIS receipt
  if (!efrisReceiptNo || efrisReceiptNo.trim() === '') {
    return {
      canClaim: false,
      reason: 'EFRIS e-receipt required to claim input tax credit in Uganda',
    };
  }

  return {
    canClaim: true,
  };
}

/**
 * Get tax period in format YYYY-MM
 */
export function getTaxPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get tax return due date for Uganda
 * VAT, WHT, PAYE: Due by 15th of following month
 */
export function getTaxReturnDueDate(periodEndDate: Date): Date {
  const dueDate = new Date(periodEndDate);
  dueDate.setMonth(dueDate.getMonth() + 1);
  dueDate.setDate(15);
  return dueDate;
}
