/**
 * TaxEvaluator - Advanced Tax Calculation Engine
 * Handles complex tax scenarios including exemptions, reverse charges, compound rules, and priority logic
 */

import prisma from '@/lib/prisma';

export interface TransactionContext {
  organizationId: string;
  customerId?: string;
  supplierId?: string;
  amount: number;
  productCategory?: string;
  transactionType: 'SALES' | 'PURCHASE';
  transactionDate?: Date;
  jurisdictionId?: string;
  lineItems?: TransactionLineItem[];
}

export interface TransactionLineItem {
  id: string;
  amount: number;
  quantity: number;
  productCategory?: string;
  taxCategory?: string;
}

export interface TaxCalculationResult {
  totalTaxAmount: number;
  taxBreakdown: TaxLine[];
  jurisdictionId: string;
  jurisdictionName: string;
  requiresEInvoicing: boolean;
  reverseCharge: boolean;
  exemptions: TaxExemption[];
}

export interface TaxLine {
  ruleId: string;
  ruleName: string;
  taxType: string;
  taxRate: number;
  taxAmount: number;
  isWithholding: boolean;
  compoundSequence?: number;
  metadata?: any;
}

export interface TaxExemption {
  exemptionId: string;
  reason: string;
  certificateNumber?: string;
  validFrom: Date;
  validTo: Date;
}

export class TaxEvaluator {
  /**
   * Evaluate taxes for a transaction with full enterprise logic
   */
  static async evaluateTaxes(context: TransactionContext): Promise<TaxCalculationResult> {
    const {
      organizationId,
      customerId,
      supplierId,
      amount,
      productCategory,
      transactionType,
      transactionDate = new Date(),
      jurisdictionId,
      lineItems = []
    } = context;

    // Step 1: Determine jurisdiction if not provided
    const jurisdiction = jurisdictionId
      ? await this.getJurisdiction(jurisdictionId)
      : await this.determineJurisdiction(context);

    if (!jurisdiction) {
      throw new Error('Unable to determine tax jurisdiction');
    }

    // Step 2: Check for customer/supplier tax exemptions (highest priority)
    const exemptions = await this.checkTaxExemptions(context);
    if (exemptions.length > 0) {
      return {
        totalTaxAmount: 0,
        taxBreakdown: [],
        jurisdictionId: jurisdiction.id,
        jurisdictionName: jurisdiction.name,
        requiresEInvoicing: jurisdiction.requiresEInvoicing || false,
        reverseCharge: false,
        exemptions
      };
    }

    // Step 3: Get applicable tax rules
    const applicableRules = await this.getApplicableRules(context, jurisdiction.id);

    // Step 4: Evaluate rules with priority logic
    const taxBreakdown = await this.evaluateRules(applicableRules, context);

    // Step 5: Calculate total tax
    const totalTaxAmount = taxBreakdown.reduce((sum, line) => sum + line.taxAmount, 0);

    // Step 6: Check for reverse charge scenarios
    const reverseCharge = this.isReverseChargeApplicable(taxBreakdown, context);

    return {
      totalTaxAmount,
      taxBreakdown,
      jurisdictionId: jurisdiction.id,
      jurisdictionName: jurisdiction.name,
      requiresEInvoicing: jurisdiction.requiresEInvoicing || false,
      reverseCharge,
      exemptions: []
    };
  }

  /**
   * Check for tax exemptions (highest priority)
   */
  private static async checkTaxExemptions(context: TransactionContext): Promise<TaxExemption[]> {
    const { customerId, supplierId, organizationId, transactionDate = new Date() } = context;

    // Use TaxExemptionService for comprehensive validation
    const { TaxExemptionService } = await import('./tax-exemption-service');

    const exemptions: TaxExemption[] = [];

    // Check customer exemptions
    if (customerId) {
      const validation = await TaxExemptionService.validateExemptionForTransaction(
        organizationId,
        'CUSTOMER',
        customerId,
        transactionDate
      );

      if (validation.isValid && validation.exemption) {
        exemptions.push({
          exemptionId: validation.exemption.id,
          reason: validation.exemption.reason || 'Customer tax exemption',
          certificateNumber: validation.exemption.certificateNumber || undefined,
          validFrom: validation.exemption.validFrom,
          validTo: validation.exemption.validTo || new Date('2099-12-31')
        });
      }
    }

    // Check supplier/vendor exemptions
    if (supplierId) {
      const validation = await TaxExemptionService.validateExemptionForTransaction(
        organizationId,
        'VENDOR',
        supplierId,
        transactionDate
      );

      if (validation.isValid && validation.exemption) {
        exemptions.push({
          exemptionId: validation.exemption.id,
          reason: validation.exemption.reason || 'Supplier tax exemption',
          certificateNumber: validation.exemption.certificateNumber || undefined,
          validFrom: validation.exemption.validFrom,
          validTo: validation.exemption.validTo || new Date('2099-12-31')
        });
      }
    }

    return exemptions;
  }

  /**
   * Get applicable tax rules based on context
   */
  private static async getApplicableRules(context: TransactionContext, jurisdictionId: string) {
    const {
      organizationId,
      productCategory,
      transactionType,
      transactionDate = new Date(),
      amount
    } = context;

    const rules = await prisma.taxRule.findMany({
      where: {
        organizationId,
        OR: [
          { jurisdictionId },
          { jurisdictionId: null } // Organization-wide rules
        ],
        applicableOn: {
          in: [transactionType, 'BOTH']
        },
        isActive: true,
        effectiveFrom: { lte: transactionDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: transactionDate } }
        ],
        OR: [
          { minimumAmount: null },
          { minimumAmount: { lte: amount } }
        ],
        OR: [
          { maximumAmount: null },
          { maximumAmount: { gte: amount } }
        ],
        OR: [
          { productCategory: null },
          { productCategory }
        ]
      },
      include: {
        childRules: {
          where: { isActive: true },
          orderBy: { compoundSequence: 'asc' }
        }
      },
      orderBy: [
        { priority: 'asc' }, // Priority first
        { ruleType: 'asc' },
        { effectiveFrom: 'desc' }
      ]
    });

    return rules;
  }

  /**
   * Evaluate rules with complex logic
   */
  private static async evaluateRules(rules: any[], context: TransactionContext): Promise<TaxLine[]> {
    const taxLines: TaxLine[] = [];
    const processedRuleIds = new Set<string>();

    for (const rule of rules) {
      // Skip if already processed (for compound rules)
      if (processedRuleIds.has(rule.id)) continue;

      switch (rule.ruleType) {
        case 'EXEMPTION':
        case 'ZERO_RATE':
          // These should have been caught by exemption check, but handle here too
          if (rule.ruleType === 'ZERO_RATE') {
            taxLines.push({
              ruleId: rule.id,
              ruleName: rule.name,
              taxType: rule.taxType,
              taxRate: 0,
              taxAmount: 0,
              isWithholding: false,
              metadata: { zeroRated: true }
            });
          }
          break;

        case 'STANDARD_RATE':
        case 'REDUCED_RATE':
          taxLines.push({
            ruleId: rule.id,
            ruleName: rule.name,
            taxType: rule.taxType,
            taxRate: rule.taxRate.toNumber(),
            taxAmount: context.amount * (rule.taxRate.toNumber() / 100),
            isWithholding: false
          });
          break;

        case 'REVERSE_CHARGE':
          // Reverse charge - buyer accounts for tax
          taxLines.push({
            ruleId: rule.id,
            ruleName: rule.name,
            taxType: rule.taxType,
            taxRate: rule.taxRate.toNumber(),
            taxAmount: context.amount * (rule.taxRate.toNumber() / 100),
            isWithholding: false,
            metadata: { reverseCharge: true }
          });
          break;

        case 'COMPOUND':
          // Handle compound rules (multiple taxes)
          const compoundLines = await this.evaluateCompoundRules(rule, context);
          taxLines.push(...compoundLines);
          // Mark child rules as processed
          rule.childRules.forEach((child: any) => processedRuleIds.add(child.id));
          break;

        case 'WITHHOLDING':
          taxLines.push({
            ruleId: rule.id,
            ruleName: rule.name,
            taxType: rule.taxType,
            taxRate: rule.taxRate.toNumber(),
            taxAmount: context.amount * (rule.taxRate.toNumber() / 100),
            isWithholding: true
          });
          break;

        default:
          // Custom calculation
          const customAmount = this.evaluateCustomFormula(rule.calculationFormula, context);
          taxLines.push({
            ruleId: rule.id,
            ruleName: rule.name,
            taxType: rule.taxType,
            taxRate: rule.taxRate.toNumber(),
            taxAmount: customAmount,
            isWithholding: false,
            metadata: { customFormula: rule.calculationFormula }
          });
      }
    }

    return taxLines;
  }

  /**
   * Evaluate compound tax rules
   */
  private static async evaluateCompoundRules(parentRule: any, context: TransactionContext): Promise<TaxLine[]> {
    const lines: TaxLine[] = [];

    // Add parent rule first
    lines.push({
      ruleId: parentRule.id,
      ruleName: parentRule.name,
      taxType: parentRule.taxType,
      taxRate: parentRule.taxRate.toNumber(),
      taxAmount: context.amount * (parentRule.taxRate.toNumber() / 100),
      isWithholding: false,
      compoundSequence: parentRule.compoundSequence || 0
    });

    // Add child rules
    for (const childRule of parentRule.childRules) {
      lines.push({
        ruleId: childRule.id,
        ruleName: childRule.name,
        taxType: childRule.taxType,
        taxRate: childRule.taxRate.toNumber(),
        taxAmount: context.amount * (childRule.taxRate.toNumber() / 100),
        isWithholding: false,
        compoundSequence: childRule.compoundSequence || 0
      });
    }

    return lines.sort((a, b) => (a.compoundSequence || 0) - (b.compoundSequence || 0));
  }

  /**
   * Evaluate custom calculation formulas
   */
  private static evaluateCustomFormula(formula: string | null, context: TransactionContext): number {
    if (!formula) return 0;

    // Simple formula evaluation (can be extended)
    try {
      // Replace variables with values
      let expression = formula
        .replace(/AMOUNT/g, context.amount.toString())
        .replace(/QUANTITY/g, (context.lineItems?.[0]?.quantity || 1).toString());

      // Basic arithmetic evaluation (use a proper expression parser in production)
      return Function('"use strict"; return (' + expression + ')')();
    } catch (error) {
      console.error('Error evaluating custom formula:', error);
      return 0;
    }
  }

  /**
   * Check if reverse charge is applicable
   */
  private static isReverseChargeApplicable(taxLines: TaxLine[], context: TransactionContext): boolean {
    // Reverse charge typically applies in B2B EU transactions
    return taxLines.some(line => line.metadata?.reverseCharge) &&
           context.transactionType === 'PURCHASE' &&
           context.customerId; // Assuming B2B if customerId exists
  }

  /**
   * Get jurisdiction details
   */
  private static async getJurisdiction(jurisdictionId: string) {
    return prisma.taxJurisdiction.findUnique({
      where: { id: jurisdictionId },
      select: {
        id: true,
        name: true,
        requiresEInvoicing: true
      }
    });
  }

  /**
   * Determine jurisdiction based on transaction context
   */
  private static async determineJurisdiction(context: TransactionContext) {
    // Use existing TaxService logic
    const { TaxService } = await import('./tax-service');

    const taxContext = {
      organizationId: context.organizationId,
      amount: context.amount,
      transactionDate: context.transactionDate
    };

    // This would need to be adapted from the existing TaxService
    // For now, return a default jurisdiction
    const jurisdictions = await prisma.taxJurisdiction.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true
      },
      take: 1
    });

    return jurisdictions[0];
  }
}