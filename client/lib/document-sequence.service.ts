/**
 * Document Sequence Service
 * Handles branch-specific and organization-wide document numbering
 */

import prisma from '@/lib/prisma';
import { DocumentType } from '@prisma/client';

export interface SequenceConfig {
  prefix: string;
  includeYear?: boolean;
  includeMonth?: boolean;
  padding?: number;
}

export class DocumentSequenceService {
  /**
   * Generate next document number for a specific type
   */
  static async generateDocumentNumber(
    organizationId: string,
    documentType: DocumentType,
    branchId?: string,
    config?: Partial<SequenceConfig>
  ): Promise<string> {
    const now = new Date();
    const year = config?.includeYear ? now.getFullYear() : undefined;
    const month = config?.includeMonth ? now.getMonth() + 1 : undefined;
    const prefix = config?.prefix || this.getDefaultPrefix(documentType);
    const padding = config?.padding || 4;

    // Try branch-specific sequence first, then organization-wide
    let sequence = await this.getOrCreateSequence(organizationId, documentType, branchId, year, month);

    // Increment and get next number
    const nextNumber = sequence.currentNumber + 1;

    // Update sequence
    await prisma.documentSequence.update({
      where: { id: sequence.id },
      data: { currentNumber: nextNumber },
    });

    // Format number with padding
    const numberPart = nextNumber.toString().padStart(padding, '0');

    // Build final number
    const parts = [prefix];
    if (year) parts.push(year.toString());
    if (month) parts.push(month.toString().padStart(2, '0'));
    parts.push(numberPart);

    return parts.join('-');
  }

  /**
   * Get or create sequence record
   */
  private static async getOrCreateSequence(
    organizationId: string,
    documentType: DocumentType,
    branchId?: string,
    year?: number,
    month?: number
  ) {
    // Normalize values to null if undefined
    const normalizedBranchId: string | null = branchId ?? null;
    const normalizedYear: number | null = year ?? null;
    const normalizedMonth: number | null = month ?? null;

    // Use findFirst instead of findUnique to avoid composite key issues
    let sequence = await prisma.documentSequence.findFirst({
      where: {
        organizationId,
        branchId: normalizedBranchId,
        documentType,
        year: normalizedYear,
        month: normalizedMonth,
      },
    });

    if (!sequence) {
      // If branch-specific doesn't exist, try organization-wide
      if (branchId) {
        sequence = await prisma.documentSequence.findFirst({
          where: {
            organizationId,
            branchId: null,
            documentType,
            year: normalizedYear,
            month: normalizedMonth,
          },
        });
      }

      // Create new sequence if none exists
      if (!sequence) {
        sequence = await prisma.documentSequence.create({
          data: {
            organizationId,
            branchId: normalizedBranchId,
            documentType,
            year: normalizedYear,
            month: normalizedMonth,
            currentNumber: 0,
          },
        });
      }
    }

    return sequence;
  }

  /**
   * Get default prefix for document type
   */
  private static getDefaultPrefix(documentType: DocumentType): string {
    const prefixes: Record<DocumentType, string> = {
      INVOICE: 'INV',
      BILL: 'BILL',
      CREDIT_NOTE: 'CN',
      DEBIT_NOTE: 'DN',
      PAYMENT: 'PAY',
      CUSTOMER: 'CUST',
      VENDOR: 'VEND',
      TRANSACTION: 'TXN',
    };

    return prefixes[documentType] || 'DOC';
  }

  /**
   * Set custom sequence configuration for branch
   */
  static async setBranchSequenceConfig(
    organizationId: string,
    branchId: string,
    documentType: DocumentType,
    config: SequenceConfig
  ) {
    // Check if branch belongs to organization
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
      },
    });

    if (!branch) {
      throw new Error('Branch not found in organization');
    }

    // Store config in branch metadata or create a dedicated config table
    // For now, we'll use metadata
    const metadata = branch.metadata as any || {};
    metadata.documentSequences = metadata.documentSequences || {};
    metadata.documentSequences[documentType] = config;

    await prisma.branch.update({
      where: { id: branchId },
      data: { metadata },
    });
  }

  /**
   * Get sequence configuration for branch (with organization fallback)
   */
  static async getSequenceConfig(
    organizationId: string,
    branchId: string | undefined,
    documentType: DocumentType
  ): Promise<SequenceConfig> {
    // Use default configuration since metadata field doesn't exist
    // In the future, this could be extended to read from a settings table
    return {
      prefix: this.getDefaultPrefix(documentType),
      includeYear: true,
      includeMonth: false,
      padding: 4,
    };
  }
}