/**
 * Payment Service with Tax Exemption Integration
 * Handles payment processing with automatic WHT exemption validation
 */

import prisma from '@/lib/prisma';
import { TaxExemptionService } from './tax-exemption-service';

export interface PaymentContext {
  organizationId: string;
  vendorId: string;
  amount: number;
  paymentDate?: Date;
  description?: string;
}

export interface PaymentResult {
  shouldWithholdTax: boolean;
  withholdingAmount: number;
  withholdingRate: number;
  exemptionDetails?: {
    exemptionId: string;
    certificateNumber: string;
    reason: string;
  };
  warnings: string[];
}

export class PaymentService {
  /**
   * Process payment with automatic WHT exemption checking
   */
  static async processPayment(context: PaymentContext): Promise<PaymentResult> {
    const {
      organizationId,
      vendorId,
      amount,
      paymentDate = new Date()
    } = context;

    const warnings: string[] = [];

    // Check for WHT exemption
    const exemptionCheck = await TaxExemptionService.shouldExemptWHT(
      organizationId,
      vendorId,
      amount,
      paymentDate
    );

    if (exemptionCheck.shouldExempt) {
      return {
        shouldWithholdTax: false,
        withholdingAmount: 0,
        withholdingRate: 0,
        exemptionDetails: {
          exemptionId: exemptionCheck.exemption!.id,
          certificateNumber: exemptionCheck.exemption!.certificateNumber || 'N/A',
          reason: exemptionCheck.reason!
        },
        warnings
      };
    }

    // Default WHT rate (Uganda URA standard 6% for professional services)
    const defaultWHTRate = 6.0;
    const withholdingAmount = amount * (defaultWHTRate / 100);

    // Check if amount exceeds threshold (UGX 1M for professional services)
    const thresholdAmount = 1000000; // UGX 1M
    if (amount < thresholdAmount) {
      warnings.push(`Amount below WHT threshold (${thresholdAmount.toLocaleString()}). No withholding required.`);
      return {
        shouldWithholdTax: false,
        withholdingAmount: 0,
        withholdingRate: 0,
        warnings
      };
    }

    return {
      shouldWithholdTax: true,
      withholdingAmount,
      withholdingRate: defaultWHTRate,
      warnings
    };
  }

  /**
   * Validate payment before processing
   */
  static async validatePayment(context: PaymentContext): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!context.vendorId) {
      errors.push('Vendor ID is required');
    }

    if (!context.amount || context.amount <= 0) {
      errors.push('Valid payment amount is required');
    }

    // Check vendor exists
    if (context.vendorId) {
      const vendor = await prisma.vendor?.findUnique({
        where: { id: context.vendorId },
        select: { id: true, name: true }
      });

      if (!vendor) {
        errors.push('Vendor not found');
      }
    }

    // Check for expired or invalid exemptions
    if (context.vendorId) {
      const exemptionValidation = await TaxExemptionService.validateExemptionForTransaction(
        context.organizationId,
        'VENDOR',
        context.vendorId,
        context.paymentDate
      );

      if (!exemptionValidation.isValid && exemptionValidation.errors.length > 0) {
        warnings.push(...exemptionValidation.errors);
      }

      if (exemptionValidation.warnings.length > 0) {
        warnings.push(...exemptionValidation.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get payment summary with tax implications
   */
  static async getPaymentSummary(organizationId: string, startDate: Date, endDate: Date): Promise<{
    totalPayments: number;
    totalWithheld: number;
    exemptedPayments: number;
    exemptionBreakdown: any[];
  }> {
    // This would typically query payment tables
    // For now, return mock data structure
    return {
      totalPayments: 0,
      totalWithheld: 0,
      exemptedPayments: 0,
      exemptionBreakdown: []
    };
  }
}