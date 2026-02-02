/**
 * Tax Service with Strategy Pattern
 * Handles jurisdiction determination and tax calculations for different countries
 */

import prisma from '@/lib/prisma';
import { SUPPORTED_COUNTRIES } from './compliance-pack-selector';

export interface Address {
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
}

export interface TaxCalculationContext {
  organizationId: string;
  amount: number;
  address?: Address;
  productCategory?: string;
  customerType?: string;
  transactionDate?: Date;
}

export interface TaxResult {
  jurisdictionId: string;
  jurisdictionName: string;
  taxAmount: number;
  taxRate: number;
  taxType: string;
  isWithholding: boolean;
  requiresEInvoicing: boolean;
  metadata?: any;
}

// Strategy interface for country-specific tax logic
export interface TaxStrategy {
  countryCode: string;

  // Determine applicable jurisdiction based on address
  determineJurisdiction(context: TaxCalculationContext): Promise<string | null>;

  // Calculate tax for a given jurisdiction
  calculateTax(context: TaxCalculationContext, jurisdictionId: string): Promise<TaxResult[]>;

  // Get e-invoicing requirements
  getEInvoicingRequirements(jurisdictionId: string): Promise<{
    required: boolean;
    format: string;
    metadata: any;
  }>;

  // Validate tax compliance
  validateCompliance(context: TaxCalculationContext): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

// Registry of tax strategies
class TaxStrategyRegistry {
  private strategies: Map<string, TaxStrategy> = new Map();

  register(strategy: TaxStrategy) {
    this.strategies.set(strategy.countryCode, strategy);
  }

  get(countryCode: string): TaxStrategy | null {
    return this.strategies.get(countryCode) || null;
  }

  getAll(): TaxStrategy[] {
    return Array.from(this.strategies.values());
  }
}

const strategyRegistry = new TaxStrategyRegistry();

// Base strategy class
export abstract class BaseTaxStrategy implements TaxStrategy {
  abstract countryCode: string;

  async determineJurisdiction(context: TaxCalculationContext): Promise<string | null> {
    if (!context.address) {
      // Default to organization's primary jurisdiction
      const org = await prisma.organization.findUnique({
        where: { id: context.organizationId },
        select: { homeCountry: true },
      });

      if (!org) return null;

      // Find federal/national jurisdiction
      const jurisdiction = await prisma.taxJurisdiction.findFirst({
        where: {
          organizationId: context.organizationId,
          country: org.homeCountry,
          jurisdictionType: 'FEDERAL',
          isActive: true,
        },
      });

      return jurisdiction?.id || null;
    }

    const { country, state, city, postalCode } = context.address;

    // Find most specific jurisdiction match
    const jurisdictions = await prisma.taxJurisdiction.findMany({
      where: {
        organizationId: context.organizationId,
        country,
        isActive: true,
      },
      orderBy: [
        { jurisdictionType: 'asc' }, // More specific types first
        { postalCodeStart: 'desc' },
      ],
    });

    // Match by postal code range first
    if (postalCode) {
      for (const jur of jurisdictions) {
        if (jur.postalCodeStart && jur.postalCodeEnd) {
          if (postalCode >= jur.postalCodeStart && postalCode <= jur.postalCodeEnd) {
            return jur.id;
          }
        }
      }
    }

    // Match by city
    if (city) {
      const cityJur = jurisdictions.find(j => j.city === city);
      if (cityJur) return cityJur.id;
    }

    // Match by state/province
    if (state) {
      const stateJur = jurisdictions.find(j => j.stateProvince === state);
      if (stateJur) return stateJur.id;
    }

    // Default to federal/national
    const federalJur = jurisdictions.find(j => j.jurisdictionType === 'FEDERAL');
    return federalJur?.id || null;
  }

  async getEInvoicingRequirements(jurisdictionId: string): Promise<{
    required: boolean;
    format: string;
    metadata: any;
  }> {
    const jurisdiction = await prisma.taxJurisdiction.findUnique({
      where: { id: jurisdictionId },
      select: {
        requiresEInvoicing: true,
        eInvoiceFormat: true,
        metadata: true,
      },
    });

    return {
      required: jurisdiction?.requiresEInvoicing || false,
      format: jurisdiction?.eInvoiceFormat || 'NONE',
      metadata: jurisdiction?.metadata || {},
    };
  }

  async validateCompliance(context: TaxCalculationContext): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation - can be extended by subclasses
    if (!context.amount || context.amount <= 0) {
      errors.push('Invalid tax amount');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Uganda URA Strategy
export class UgandaURATaxStrategy extends BaseTaxStrategy {
  countryCode = 'UG';

  async calculateTax(context: TaxCalculationContext, jurisdictionId: string): Promise<TaxResult[]> {
    const results: TaxResult[] = [];

    // Get applicable tax rules for this jurisdiction
    const taxRules = await prisma.taxRule.findMany({
      where: {
        organizationId: context.organizationId,
        OR: [
          { jurisdictionId },
          { jurisdictionId: null }, // Organization-wide rules
        ],
        taxType: 'VAT',
        isActive: true,
        effectiveFrom: { lte: context.transactionDate || new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: context.transactionDate || new Date() } },
        ],
      },
      orderBy: { priority: 'asc' },
    });

    for (const rule of taxRules) {
      if (context.amount >= (rule.minimumAmount?.toNumber() || 0) &&
          (!rule.maximumAmount || context.amount <= rule.maximumAmount.toNumber())) {

        const taxAmount = context.amount * (rule.taxRate.toNumber() / 100);

        results.push({
          jurisdictionId,
          jurisdictionName: 'Uganda Revenue Authority',
          taxAmount,
          taxRate: rule.taxRate.toNumber(),
          taxType: rule.taxType,
          isWithholding: false,
          requiresEInvoicing: true, // Uganda requires EFRIS
          metadata: {
            ruleId: rule.id,
            requiresEFRIS: true,
          },
        });
      }
    }

    return results;
  }
}

// Kenya KRA Strategy
export class KenyaKRATaxStrategy extends BaseTaxStrategy {
  countryCode = 'KE';

  async calculateTax(context: TaxCalculationContext, jurisdictionId: string): Promise<TaxResult[]> {
    // Similar implementation for Kenya
    const results: TaxResult[] = [];

    const taxRules = await prisma.taxRule.findMany({
      where: {
        organizationId: context.organizationId,
        OR: [
          { jurisdictionId },
          { jurisdictionId: null },
        ],
        taxType: 'VAT',
        isActive: true,
        effectiveFrom: { lte: context.transactionDate || new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: context.transactionDate || new Date() } },
        ],
      },
      orderBy: { priority: 'asc' },
    });

    for (const rule of taxRules) {
      const taxAmount = context.amount * (rule.taxRate.toNumber() / 100);

      results.push({
        jurisdictionId,
        jurisdictionName: 'Kenya Revenue Authority',
        taxAmount,
        taxRate: rule.taxRate.toNumber(),
        taxType: rule.taxType,
        isWithholding: false,
        requiresEInvoicing: false, // Kenya doesn't require eTIMS yet
        metadata: {
          ruleId: rule.id,
        },
      });
    }

    return results;
  }
}

// Register strategies
strategyRegistry.register(new UgandaURATaxStrategy());
strategyRegistry.register(new KenyaKRATaxStrategy());

export class TaxService {
  /**
   * Get tax strategy for a country
   */
  static getStrategy(countryCode: string): TaxStrategy | null {
    return strategyRegistry.get(countryCode);
  }

  /**
   * Determine applicable tax jurisdiction for a transaction
   */
  static async determineJurisdiction(context: TaxCalculationContext): Promise<string | null> {
    const strategy = this.getStrategyForOrganization(context.organizationId);
    if (!strategy) return null;

    return strategy.determineJurisdiction(context);
  }

  /**
   * Calculate taxes for a transaction
   */
  static async calculateTaxes(context: TaxCalculationContext): Promise<TaxResult[]> {
    const jurisdictionId = await this.determineJurisdiction(context);
    if (!jurisdictionId) return [];

    const strategy = this.getStrategyForOrganization(context.organizationId);
    if (!strategy) return [];

    return strategy.calculateTax(context, jurisdictionId);
  }

  /**
   * Generate tax summary report by jurisdiction
   */
  static async generateTaxSummaryReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const results = await prisma.$queryRaw`
      SELECT
        tj.name as jurisdiction_name,
        tj.code as jurisdiction_code,
        tj.country,
        tj.country_code,
        tj.tax_authority,
        COALESCE(SUM(itl.tax_amount), 0) as total_tax_collected,
        COUNT(DISTINCT i.id) as total_transactions,
        CASE
          WHEN COUNT(DISTINCT i.id) > 0 THEN ROUND(AVG(itl.tax_rate), 4)
          ELSE 0
        END as average_tax_rate,
        coa.name as liability_account_name
      FROM tax_jurisdiction tj
      LEFT JOIN invoice_tax_line itl ON tj.id = itl.jurisdiction_id
      LEFT JOIN invoice i ON itl.invoice_id = i.id AND i.invoice_date BETWEEN ${startDate} AND ${endDate} AND i.status = 'POSTED'
      LEFT JOIN chart_of_account coa ON tj.tax_liability_account_id = coa.id
      WHERE tj.organization_id = ${organizationId}
      GROUP BY tj.id, tj.name, tj.code, tj.country, tj.country_code, tj.tax_authority, coa.name
      ORDER BY tj.country, tj.jurisdiction_type, tj.name
    `;

    return (results as any[]).map(result => ({
      jurisdictionName: result.jurisdiction_name,
      jurisdictionCode: result.jurisdiction_code,
      country: result.country,
      countryCode: result.country_code,
      taxAuthority: result.tax_authority,
      totalTaxCollected: parseFloat(result.total_tax_collected) || 0,
      totalTransactions: parseInt(result.total_transactions) || 0,
      averageTaxRate: parseFloat(result.average_tax_rate) || 0,
      liabilityAccountName: result.liability_account_name
    }));
  }

  /**
   * Get e-invoicing requirements for a jurisdiction
   */
  static async getEInvoicingRequirements(
    organizationId: string,
    jurisdictionId: string
  ): Promise<{
    required: boolean;
    format: string;
    metadata: any;
  }> {
    const strategy = this.getStrategyForOrganization(organizationId);
    if (!strategy) {
      return { required: false, format: 'NONE', metadata: {} };
    }

    return strategy.getEInvoicingRequirements(jurisdictionId);
  }

  private static getStrategyForOrganization(organizationId: string): TaxStrategy | null {
    // For now, determine strategy based on organization's home country
    // In production, this could be more sophisticated
    // TODO: Add organization.country field and use it here
    return strategyRegistry.get('UG'); // Default to Uganda for now
  }
}