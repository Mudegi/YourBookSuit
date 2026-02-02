/**
 * Tax Exemption Service
 * Handles certificate management, validation, and compliance for global tax exemptions
 * Special focus on Uganda URA WHT exemptions and EFRIS integration
 */

import prisma from '@/lib/prisma';
import { TaxEvaluator } from './tax-evaluator';

export interface ExemptionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  exemption?: any;
}

export interface ExemptionHealthCheck {
  totalExemptions: number;
  activeExemptions: number;
  expiringSoon: number; // Within 30 days
  expired: number;
  missingCertificates: number;
  invalidCertificates: number;
  alerts: ExemptionAlert[];
}

export interface ExemptionAlert {
  type: 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_CERTIFICATE' | 'INVALID_CERTIFICATE';
  exemptionId: string;
  exemptionNumber: string;
  entityName: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class TaxExemptionService {
  /**
   * Validate exemption certificate for a transaction
   */
  static async validateExemptionForTransaction(
    organizationId: string,
    entityType: string,
    entityId: string,
    transactionDate: Date = new Date(),
    exemptionType?: string
  ): Promise<ExemptionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Find active exemptions for this entity
      const exemptions = await prisma.taxExemption.findMany({
        where: {
          organizationId,
          entityType,
          entityId,
          isActive: true,
          validFrom: { lte: transactionDate },
          OR: [
            { validTo: null },
            { validTo: { gte: transactionDate } }
          ],
          ...(exemptionType && { exemptionType })
        },
        include: {
          taxRule: true
        },
        orderBy: { validTo: 'desc' } // Most recent first
      });

      if (exemptions.length === 0) {
        return {
          isValid: false,
          errors: ['No valid tax exemption found for this entity'],
          warnings: []
        };
      }

      // Check each exemption for validity
      for (const exemption of exemptions) {
        // Check expiry
        if (exemption.validTo && exemption.validTo < transactionDate) {
          errors.push(`Exemption ${exemption.exemptionNumber} has expired`);
          continue;
        }

        // Check if certificate is present
        if (!exemption.certificateNumber && !exemption.documentUrl) {
          warnings.push(`Exemption ${exemption.exemptionNumber} has no certificate number or document`);
        }

        // Check issuing authority for Uganda URA compliance
        if (organizationId.includes('UG') && exemption.issuingAuthority !== 'URA') {
          warnings.push(`Uganda exemption should be issued by URA`);
        }

        // If we have a valid exemption, return it
        if (errors.length === 0) {
          return {
            isValid: true,
            errors: [],
            warnings,
            exemption
          };
        }
      }

      return {
        isValid: false,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error validating exemption:', error);
      return {
        isValid: false,
        errors: ['Failed to validate exemption certificate'],
        warnings: []
      };
    }
  }

  /**
   * Check if WHT should be exempted for Uganda URA compliance
   */
  static async shouldExemptWHT(
    organizationId: string,
    vendorId: string,
    amount: number,
    transactionDate: Date = new Date()
  ): Promise<{ shouldExempt: boolean; exemption?: any; reason?: string }> {
    try {
      const validation = await this.validateExemptionForTransaction(
        organizationId,
        'VENDOR',
        vendorId,
        transactionDate,
        'WHT_EXEMPTION'
      );

      if (validation.isValid && validation.exemption) {
        // Additional checks for Uganda WHT exemption
        const exemption = validation.exemption;

        // Check if it's a valid URA WHT exemption
        if (exemption.issuingAuthority === 'URA' && exemption.exemptionType === 'WHT_EXEMPTION') {
          return {
            shouldExempt: true,
            exemption,
            reason: `URA WHT Exemption Certificate ${exemption.certificateNumber}`
          };
        }
      }

      return { shouldExempt: false };

    } catch (error) {
      console.error('Error checking WHT exemption:', error);
      return { shouldExempt: false };
    }
  }

  /**
   * Get EFRIS exemption reason for Uganda compliance
   */
  static getEFRISExemptionReason(exemption: any): string {
    // Map exemption types to EFRIS reason codes
    const efrisReasonMap: Record<string, string> = {
      'VAT_EXEMPTION': 'EXEMPT',
      'ZERO_RATED': 'ZERO_RATED',
      'EXPORT': 'EXPORT',
      'MEDICAL_SUPPLIES': 'MEDICAL',
      'EDUCATION': 'EDUCATION',
      'AGRICULTURE': 'AGRICULTURE',
      'MANUFACTURING': 'MANUFACTURING'
    };

    return exemption.efrisReason ||
           efrisReasonMap[exemption.exemptionType] ||
           exemption.reason ||
           'OTHER';
  }

  /**
   * Health check for tax exemptions
   */
  static async performHealthCheck(organizationId: string): Promise<ExemptionHealthCheck> {
    const alerts: ExemptionAlert[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get all exemptions
    const exemptions = await prisma.taxExemption.findMany({
      where: { organizationId },
      include: {
        taxRule: {
          select: { name: true }
        }
      }
    });

    let activeExemptions = 0;
    let expiringSoon = 0;
    let expired = 0;
    let missingCertificates = 0;
    let invalidCertificates = 0;

    for (const exemption of exemptions) {
      const entityName = await this.getEntityName(exemption.entityType, exemption.entityId);

      // Check expiry status
      if (!exemption.isActive) {
        continue; // Skip inactive
      }

      if (exemption.validTo) {
        if (exemption.validTo < now) {
          expired++;
          alerts.push({
            type: 'EXPIRED',
            exemptionId: exemption.id,
            exemptionNumber: exemption.exemptionNumber,
            entityName,
            message: `Certificate expired on ${exemption.validTo.toLocaleDateString()}`,
            severity: 'CRITICAL'
          });
        } else if (exemption.validTo <= thirtyDaysFromNow) {
          expiringSoon++;
          alerts.push({
            type: 'EXPIRING_SOON',
            exemptionId: exemption.id,
            exemptionNumber: exemption.exemptionNumber,
            entityName,
            message: `Certificate expires on ${exemption.validTo.toLocaleDateString()}`,
            severity: 'MEDIUM'
          });
        } else {
          activeExemptions++;
        }
      } else {
        activeExemptions++; // No expiry date
      }

      // Check for missing certificates
      if (!exemption.certificateNumber && !exemption.documentUrl) {
        missingCertificates++;
        alerts.push({
          type: 'MISSING_CERTIFICATE',
          exemptionId: exemption.id,
          exemptionNumber: exemption.exemptionNumber,
          entityName,
          message: 'No certificate number or document attached',
          severity: 'HIGH'
        });
      }

      // Check for invalid issuing authority (Uganda focus)
      if (organizationId.includes('UG') && exemption.issuingAuthority !== 'URA') {
        invalidCertificates++;
        alerts.push({
          type: 'INVALID_CERTIFICATE',
          exemptionId: exemption.id,
          exemptionNumber: exemption.exemptionNumber,
          entityName,
          message: 'Non-URA certificate in Uganda organization',
          severity: 'HIGH'
        });
      }
    }

    return {
      totalExemptions: exemptions.length,
      activeExemptions,
      expiringSoon,
      expired,
      missingCertificates,
      invalidCertificates,
      alerts: alerts.sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };
  }

  /**
   * Upload and store exemption certificate document
   */
  static async uploadCertificateDocument(
    exemptionId: string,
    file: File,
    organizationId: string
  ): Promise<{ success: boolean; documentUrl?: string; error?: string }> {
    try {
      // In a real implementation, you would:
      // 1. Upload file to cloud storage (AWS S3, etc.)
      // 2. Generate secure URL
      // 3. Update database with documentUrl

      // For now, simulate the process
      const documentUrl = `/api/files/exemptions/${organizationId}/${exemptionId}/${file.name}`;

      await prisma.taxExemption.update({
        where: { id: exemptionId },
        data: {
          documentUrl,
          documentPath: `/uploads/exemptions/${organizationId}/${exemptionId}/${file.name}`,
          updatedAt: new Date()
        }
      });

      return { success: true, documentUrl };
    } catch (error) {
      console.error('Error uploading certificate:', error);
      return { success: false, error: 'Failed to upload certificate document' };
    }
  }

  /**
   * Get entity name for display purposes
   */
  private static async getEntityName(entityType: string, entityId: string): Promise<string> {
    try {
      switch (entityType.toUpperCase()) {
        case 'CUSTOMER':
          const customer = await prisma.customer.findUnique({
            where: { id: entityId },
            select: { companyName: true, firstName: true, lastName: true }
          });
          return customer?.companyName || `${customer?.firstName} ${customer?.lastName}` || entityId;

        case 'VENDOR':
        case 'SUPPLIER':
          const vendor = await prisma.vendor?.findUnique({
            where: { id: entityId },
            select: { name: true }
          });
          return vendor?.name || entityId;

        default:
          return entityId;
      }
    } catch (error) {
      return entityId;
    }
  }

  /**
   * Bulk validate exemptions for compliance audit
   */
  static async auditExemptions(organizationId: string): Promise<{
    valid: number;
    invalid: number;
    warnings: number;
    details: any[];
  }> {
    const exemptions = await prisma.taxExemption.findMany({
      where: { organizationId },
      include: { taxRule: true }
    });

    let valid = 0;
    let invalid = 0;
    let warnings = 0;
    const details: any[] = [];

    for (const exemption of exemptions) {
      const validation = await this.validateExemptionForTransaction(
        organizationId,
        exemption.entityType,
        exemption.entityId,
        new Date(),
        exemption.exemptionType
      );

      const entityName = await this.getEntityName(exemption.entityType, exemption.entityId);

      if (validation.isValid) {
        valid++;
      } else {
        invalid++;
      }

      if (validation.warnings.length > 0) {
        warnings++;
      }

      details.push({
        exemptionNumber: exemption.exemptionNumber,
        entityName,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    return { valid, invalid, warnings, details };
  }
}