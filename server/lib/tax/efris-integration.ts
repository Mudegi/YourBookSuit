/**
 * EFRIS Integration Helper
 * Handles EFRIS API compliance for tax exemptions and transactions
 */

import { TaxExemptionService } from './tax-exemption-service';

export interface EFRISTransaction {
  invoiceNumber: string;
  transactionDate: Date;
  customerId?: string;
  vendorId?: string;
  amount: number;
  taxAmount: number;
  exemptionDetails?: {
    exemptionId: string;
    reason: string;
    certificateNumber?: string;
  };
}

export interface EFRISPayload {
  invoiceNo: string;
  invoiceDate: string;
  buyerDetails: any;
  goodsDetails: any[];
  taxDetails: any[];
  summary: any;
}

export class EFRISIntegration {
  /**
   * Prepare EFRIS payload with exemption information
   */
  static async prepareEFRISPayload(
    organizationId: string,
    transaction: EFRISTransaction
  ): Promise<EFRISPayload> {
    const { customerId, vendorId, exemptionDetails } = transaction;

    let exemptionReason = 'NONE';

    // Check for exemptions
    if (customerId) {
      const validation = await TaxExemptionService.validateExemptionForTransaction(
        organizationId,
        'CUSTOMER',
        customerId,
        transaction.transactionDate
      );

      if (validation.isValid && validation.exemption) {
        exemptionReason = TaxExemptionService.getEFRISExemptionReason(validation.exemption);
      }
    }

    if (vendorId && exemptionDetails) {
      exemptionReason = TaxExemptionService.getEFRISExemptionReason({
        efrisReason: exemptionDetails.reason,
        exemptionType: 'PURCHASE_EXEMPTION'
      });
    }

    // Build EFRIS payload
    const payload: EFRISPayload = {
      invoiceNo: transaction.invoiceNumber,
      invoiceDate: transaction.transactionDate.toISOString().split('T')[0],
      buyerDetails: {
        // Buyer details would be populated here
      },
      goodsDetails: [
        // Goods details would be populated here
      ],
      taxDetails: [
        {
          taxCategory: exemptionReason === 'NONE' ? 'VAT' : 'EXEMPT',
          taxRate: exemptionReason === 'NONE' ? 18.0 : 0.0,
          taxAmount: transaction.taxAmount,
          exemptionReason: exemptionReason !== 'NONE' ? exemptionReason : undefined
        }
      ],
      summary: {
        grossAmount: transaction.amount,
        taxAmount: transaction.taxAmount,
        netAmount: transaction.amount - transaction.taxAmount,
        exemptionReason
      }
    };

    return payload;
  }

  /**
   * Validate EFRIS compliance for exempt transactions
   */
  static validateEFRISCompliance(payload: EFRISPayload): {
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!payload.invoiceNo) {
      errors.push('Invoice number is required');
    }

    if (!payload.invoiceDate) {
      errors.push('Invoice date is required');
    }

    // Validate exemption reasons
    const validEFRISReasons = [
      'NONE', 'EXEMPT', 'ZERO_RATED', 'EXPORT',
      'MEDICAL', 'EDUCATION', 'AGRICULTURE', 'MANUFACTURING'
    ];

    if (payload.summary.exemptionReason &&
        !validEFRISReasons.includes(payload.summary.exemptionReason)) {
      errors.push(`Invalid EFRIS exemption reason: ${payload.summary.exemptionReason}`);
    }

    // Check tax consistency
    if (payload.summary.exemptionReason === 'EXEMPT' && payload.summary.taxAmount > 0) {
      errors.push('Exempt transactions should have zero tax amount');
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Submit to EFRIS API (mock implementation)
   */
  static async submitToEFRIS(payload: EFRISPayload): Promise<{
    success: boolean;
    efrisReference?: string;
    error?: string;
  }> {
    try {
      // Validate payload first
      const validation = this.validateEFRISCompliance(payload);
      if (!validation.isCompliant) {
        return {
          success: false,
          error: `EFRIS validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Mock EFRIS API call
      console.log('Submitting to EFRIS:', JSON.stringify(payload, null, 2));

      // Simulate API response
      return {
        success: true,
        efrisReference: `EFRIS-${Date.now()}`
      };

    } catch (error) {
      console.error('EFRIS submission error:', error);
      return {
        success: false,
        error: 'Failed to submit to EFRIS'
      };
    }
  }
}