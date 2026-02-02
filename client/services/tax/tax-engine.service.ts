/**
 * Tax Engine Service - QuickBooks-Style Tax Calculation
 * 
 * Handles tax calculation for both Inclusive and Exclusive modes,
 * supports tax groups with multiple rates, and compound taxes.
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { calculateTax, calculateLineItem } from '@/lib/tax/tax-calculation';

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface TaxAgencyRateData {
  id: string;
  name: string;
  rate: number;
  isInclusiveDefault: boolean;
  isRecoverable: boolean;
  recoveryPercentage: number;
  salesTaxAccountId?: string;
  purchaseTaxAccountId?: string;
}

export interface TaxGroupData {
  id: string;
  name: string;
  rates: Array<{
    taxAgencyRateId: string;
    sequence: number;
    isCompound: boolean;
    rate: TaxAgencyRateData;
  }>;
}

export interface TaxCalculationInput {
  amount: number;
  quantity?: number;
  discount?: number;
  taxMode: 'EXCLUSIVE' | 'INCLUSIVE';
  taxGroupId?: string;
  taxAgencyRateId?: string;
}

export interface TaxLineResult {
  taxAgencyRateId: string;
  taxName: string;
  rate: number;
  baseAmount: number;
  taxAmount: number;
  isCompound: boolean;
  sequence: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  discount: number;
  net: number;
  taxAmount: number;
  total: number;
  taxLines: TaxLineResult[];
  effectiveRate: number;
}

export class TaxEngine {
  /**
   * Calculate tax for a line item using a single tax rate
   */
  static async calculateWithSingleRate(
    amount: number,
    taxAgencyRateId: string,
    taxMode: 'EXCLUSIVE' | 'INCLUSIVE',
    quantity: number = 1,
    discount: number = 0
  ): Promise<TaxCalculationResult> {
    // Fetch the tax rate
    const taxRate = await prisma.taxAgencyRate.findUnique({
      where: { id: taxAgencyRateId },
      include: {
        taxAgency: true,
      },
    });

    if (!taxRate) {
      throw new Error(`Tax rate not found: ${taxAgencyRateId}`);
    }

    if (!taxRate.isActive) {
      throw new Error(`Tax rate is not active: ${taxRate.name}`);
    }

    // Use the core tax calculation
    const rateDecimal = Number(taxRate.rate) / 100;
    const isInclusive = taxMode === 'INCLUSIVE' || taxRate.isInclusiveDefault;
    
    const result = calculateLineItem(quantity, amount, rateDecimal, isInclusive, discount);

    const taxLine: TaxLineResult = {
      taxAgencyRateId: taxRate.id,
      taxName: taxRate.name,
      rate: Number(taxRate.rate),
      baseAmount: result.lineNet,
      taxAmount: result.lineTax,
      isCompound: false,
      sequence: 1,
    };

    return {
      subtotal: result.lineSubtotal,
      discount: result.lineDiscount,
      net: result.lineNet,
      taxAmount: result.lineTax,
      total: result.lineTotal,
      taxLines: [taxLine],
      effectiveRate: Number(taxRate.rate),
    };
  }

  /**
   * Calculate tax using a tax group (multiple rates)
   */
  static async calculateWithTaxGroup(
    amount: number,
    taxGroupId: string,
    taxMode: 'EXCLUSIVE' | 'INCLUSIVE',
    quantity: number = 1,
    discount: number = 0
  ): Promise<TaxCalculationResult> {
    // Fetch the tax group with its rates
    const taxGroup = await prisma.taxGroup.findUnique({
      where: { id: taxGroupId },
      include: {
        taxGroupRates: {
          orderBy: { sequence: 'asc' },
          include: {
            taxAgencyRate: {
              include: {
                taxAgency: true,
              },
            },
          },
        },
      },
    });

    if (!taxGroup) {
      throw new Error(`Tax group not found: ${taxGroupId}`);
    }

    if (!taxGroup.isActive) {
      throw new Error(`Tax group is not active: ${taxGroup.name}`);
    }

    if (taxGroup.taxGroupRates.length === 0) {
      throw new Error(`Tax group has no rates: ${taxGroup.name}`);
    }

    // Calculate subtotal and net (before tax)
    const qty = new Decimal(quantity);
    const price = new Decimal(amount);
    const disc = new Decimal(discount);

    const subtotal = qty.times(price);
    const netAmount = subtotal.minus(disc);

    // Apply taxes sequentially
    const taxLines: TaxLineResult[] = [];
    let taxAccumulator = new Decimal(0);

    for (const groupRate of taxGroup.taxGroupRates) {
      const taxRate = groupRate.taxAgencyRate;

      if (!taxRate.isActive) {
        continue; // Skip inactive rates
      }

      // Determine the base amount for this tax
      let baseAmount: Decimal;
      if (groupRate.isCompound) {
        // Compound tax: apply on net + previous taxes
        baseAmount = netAmount.plus(taxAccumulator);
      } else {
        // Simple tax: apply on net amount only
        baseAmount = netAmount;
      }

      // Calculate tax amount
      const rate = new Decimal(taxRate.rate).dividedBy(100);
      const taxAmount = baseAmount.times(rate);

      taxAccumulator = taxAccumulator.plus(taxAmount);

      taxLines.push({
        taxAgencyRateId: taxRate.id,
        taxName: taxRate.name,
        rate: Number(taxRate.rate),
        baseAmount: baseAmount.toNumber(),
        taxAmount: taxAmount.toNumber(),
        isCompound: groupRate.isCompound,
        sequence: groupRate.sequence,
      });
    }

    // Calculate totals
    const totalTax = taxAccumulator;
    const total = netAmount.plus(totalTax);

    // Calculate effective rate
    const effectiveRate = netAmount.gt(0) 
      ? totalTax.dividedBy(netAmount).times(100)
      : new Decimal(0);

    return {
      subtotal: subtotal.toNumber(),
      discount: disc.toNumber(),
      net: netAmount.toNumber(),
      taxAmount: totalTax.toNumber(),
      total: total.toNumber(),
      taxLines,
      effectiveRate: effectiveRate.toNumber(),
    };
  }

  /**
   * Main calculation method that routes to appropriate handler
   */
  static async calculate(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    const {
      amount,
      quantity = 1,
      discount = 0,
      taxMode,
      taxGroupId,
      taxAgencyRateId,
    } = input;

    // Validate input
    if (!taxGroupId && !taxAgencyRateId) {
      throw new Error('Either taxGroupId or taxAgencyRateId must be provided');
    }

    if (taxGroupId && taxAgencyRateId) {
      throw new Error('Cannot specify both taxGroupId and taxAgencyRateId');
    }

    // Route to appropriate calculation method
    if (taxGroupId) {
      return this.calculateWithTaxGroup(amount, taxGroupId, taxMode, quantity, discount);
    } else {
      return this.calculateWithSingleRate(amount, taxAgencyRateId!, taxMode, quantity, discount);
    }
  }

  /**
   * Get all active tax rates for an organization
   */
  static async getActiveTaxRates(organizationId: string, country?: string) {
    const where: any = {
      organizationId,
      isActive: true,
    };

    if (country) {
      where.taxAgency = {
        country,
      };
    }

    return prisma.taxAgencyRate.findMany({
      where,
      include: {
        taxAgency: true,
        salesTaxAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        purchaseTaxAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { taxAgency: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get all active tax groups for an organization
   */
  static async getActiveTaxGroups(organizationId: string) {
    return prisma.taxGroup.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        taxAgency: true,
        taxGroupRates: {
          orderBy: { sequence: 'asc' },
          include: {
            taxAgencyRate: {
              include: {
                taxAgency: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get tax rate by ID with validation
   */
  static async getTaxRate(taxAgencyRateId: string) {
    const taxRate = await prisma.taxAgencyRate.findUnique({
      where: { id: taxAgencyRateId },
      include: {
        taxAgency: true,
        salesTaxAccount: true,
        purchaseTaxAccount: true,
      },
    });

    if (!taxRate) {
      throw new Error(`Tax rate not found: ${taxAgencyRateId}`);
    }

    return taxRate;
  }

  /**
   * Get tax group by ID with validation
   */
  static async getTaxGroup(taxGroupId: string) {
    const taxGroup = await prisma.taxGroup.findUnique({
      where: { id: taxGroupId },
      include: {
        taxAgency: true,
        taxGroupRates: {
          orderBy: { sequence: 'asc' },
          include: {
            taxAgencyRate: {
              include: {
                taxAgency: true,
              },
            },
          },
        },
      },
    });

    if (!taxGroup) {
      throw new Error(`Tax group not found: ${taxGroupId}`);
    }

    return taxGroup;
  }

  /**
   * Validate tax configuration
   */
  static async validateTaxSetup(organizationId: string): Promise<{
    valid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if organization has tax agencies
    const agencies = await prisma.taxAgency.findMany({
      where: { organizationId, isActive: true },
    });

    if (agencies.length === 0) {
      errors.push('No active tax agencies configured');
    }

    // Check if agencies have rates
    for (const agency of agencies) {
      const rates = await prisma.taxAgencyRate.findMany({
        where: { taxAgencyId: agency.id, isActive: true },
      });

      if (rates.length === 0) {
        warnings.push(`Tax agency "${agency.name}" has no active rates`);
      }

      // Check GL account mapping
      for (const rate of rates) {
        if (!rate.salesTaxAccountId) {
          warnings.push(`Tax rate "${rate.name}" has no sales tax GL account mapped`);
        }
        if (!rate.purchaseTaxAccountId) {
          warnings.push(`Tax rate "${rate.name}" has no purchase tax GL account mapped`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }
}

export default TaxEngine;
