/**
 * NCR Service
 * Generic Non-Conformance Report service that uses localization strategies
 * for country-specific compliance requirements
 */

import prisma from '@/lib/prisma';
import { localizationProvider } from '@/lib/localization/localization-provider';

export interface NCRCreateData {
  organizationId: string;
  title: string;
  description: string;
  source: string;
  severity: string;
  productId?: string;
  lotNumber?: string;
  vendorId?: string;
  customerId?: string;
  quantity?: number;
  detectedDate: Date;
  detectedById: string;
  rootCause?: string;
  containmentAction?: string;
  assignedToId?: string;
  targetCloseDate?: Date;
  notes?: string;
  localComplianceData?: any; // JSONB field for country-specific data
}

export interface NCRUpdateData {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  rootCause?: string;
  containmentAction?: string;
  assignedToId?: string;
  targetCloseDate?: Date;
  closedAt?: Date;
  closedById?: string;
  notes?: string;
  localComplianceData?: any;
}

export class NCRService {
  /**
   * Create a new NCR with localization-specific validation
   */
  async createNCR(data: NCRCreateData) {
    // Initialize localization for the organization
    await localizationProvider.initializeOrganizationLocalization(data.organizationId);

    // Get localization-specific validation rules
    const validationRules = await localizationProvider.getNCRValidationRules();

    // Validate required fields based on localization rules
    const validationResult = await this.validateNCRData(data, validationRules);

    if (!validationResult.isCompliant) {
      throw new Error(`NCR validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Generate NCR number
    const ncrNumber = await this.generateNCRNumber(data.organizationId);

    // Create NCR with localization-specific data
    const ncr = await prisma.nonConformanceReport.create({
      data: {
        ...data,
        ncrNumber,
        status: 'OPEN',
        localComplianceData: data.localComplianceData || {},
      },
    });

    return ncr;
  }

  /**
   * Update an existing NCR
   */
  async updateNCR(id: string, organizationId: string, data: NCRUpdateData) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    // Get existing NCR
    const existingNcr = await prisma.nonConformanceReport.findUnique({
      where: { id },
    });

    if (!existingNcr || existingNcr.organizationId !== organizationId) {
      throw new Error('NCR not found');
    }

    // Merge update data with existing data for validation
    const updatedData = { ...existingNcr, ...data };

    // Get validation rules and validate
    const validationRules = await localizationProvider.getNCRValidationRules();
    const validationResult = await this.validateNCRData(updatedData, validationRules);

    if (!validationResult.isCompliant) {
      throw new Error(`NCR validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Update NCR
    const ncr = await prisma.nonConformanceReport.update({
      where: { id },
      data,
    });

    return ncr;
  }

  /**
   * Get NCR with localization-specific metadata
   */
  async getNCR(id: string, organizationId: string) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    const ncr = await prisma.nonConformanceReport.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        detectedBy: {
          select: { id: true, name: true, email: true },
        },
        closedBy: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: { id: true, name: true, sku: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
        customer: {
          select: { id: true, name: true },
        },
        capas: true,
      },
    });

    if (!ncr || ncr.organizationId !== organizationId) {
      throw new Error('NCR not found');
    }

    // Get localization-specific metadata
    const regulatoryRequirements = await localizationProvider.getNCRRegulatoryRequirements();
    const translationKeys = await localizationProvider.getNCRTranslationKeys();

    return {
      ...ncr,
      localizationMetadata: {
        regulatoryRequirements,
        translationKeys,
      },
    };
  }

  /**
   * List NCRs with localization-specific filtering
   */
  async listNCRs(organizationId: string, filters: any = {}) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    const where: any = {
      organizationId,
    };

    // Apply filters
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.source) where.source = filters.source;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.productId) where.productId = filters.productId;

    // Date range filters
    if (filters.detectedFrom) {
      where.detectedDate = {
        ...where.detectedDate,
        gte: filters.detectedFrom,
      };
    }
    if (filters.detectedTo) {
      where.detectedDate = {
        ...where.detectedDate,
        lte: filters.detectedTo,
      };
    }

    const ncrs = await prisma.nonConformanceReport.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true },
        },
        detectedBy: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get localization metadata for the list
    const validationRules = await localizationProvider.getNCRValidationRules();

    return {
      ncrs,
      localizationMetadata: {
        validationRules,
      },
    };
  }

  /**
   * Validate NCR data against localization rules
   */
  private async validateNCRData(data: any, validationRules: any) {
    // Use the localization provider's validation
    return await localizationProvider.validateNCRCompliance(data);
  }

  /**
   * Generate NCR number with localization-specific format
   */
  private async generateNCRNumber(organizationId: string): Promise<string> {
    // Get the last NCR for this organization
    const lastNCR = await prisma.nonConformanceReport.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    let sequenceNumber = 1;
    if (lastNCR && lastNCR.ncrNumber) {
      // Extract sequence number from last NCR
      const match = lastNCR.ncrNumber.match(/NCR-(\d+)/);
      if (match) {
        sequenceNumber = parseInt(match[1]) + 1;
      }
    }

    // Format: NCR-YYYY-XXXXX (e.g., NCR-2024-00001)
    const year = new Date().getFullYear();
    const formattedSequence = sequenceNumber.toString().padStart(5, '0');

    return `NCR-${year}-${formattedSequence}`;
  }

  /**
   * Get localization-specific NCR form configuration
   */
  async getNCRFormConfig(organizationId: string) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    const validationRules = await localizationProvider.getNCRValidationRules();
    const regulatoryRequirements = await localizationProvider.getNCRRegulatoryRequirements();
    const translationKeys = await localizationProvider.getNCRTranslationKeys();

    return {
      standardFields: [
        { name: 'title', type: 'text', required: true, label: translationKeys['ncr.title'] || 'Title' },
        { name: 'description', type: 'textarea', required: true, label: translationKeys['ncr.description'] || 'Description' },
        { name: 'source', type: 'select', required: true, label: translationKeys['ncr.source'] || 'Source' },
        { name: 'severity', type: 'select', required: true, options: validationRules.severityLevels, label: translationKeys['ncr.severity'] || 'Severity' },
        { name: 'detectedDate', type: 'date', required: true, label: 'Detected Date' },
        { name: 'productId', type: 'select', required: validationRules.requiredFields.includes('productId'), label: 'Product' },
        { name: 'lotNumber', type: 'text', required: validationRules.requiredFields.includes('lotNumber'), label: 'Lot Number' },
        { name: 'quantity', type: 'number', required: validationRules.requiredFields.includes('quantity'), label: 'Quantity' },
        { name: 'assignedToId', type: 'select', required: false, label: 'Assigned To' },
        { name: 'targetCloseDate', type: 'date', required: false, label: 'Target Close Date' },
        { name: 'notes', type: 'textarea', required: false, label: 'Notes' },
      ],
      customFields: validationRules.customFields || [],
      workflowStates: validationRules.workflowStates || [],
      regulatoryRequirements,
      translationKeys,
    };
  }

  /**
   * Process NCR workflow transitions with localization rules
   */
  async processWorkflowTransition(
    ncrId: string,
    organizationId: string,
    newStatus: string,
    userId: string,
    notes?: string
  ) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    const ncr = await prisma.nonConformanceReport.findUnique({
      where: { id: ncrId },
    });

    if (!ncr || ncr.organizationId !== organizationId) {
      throw new Error('NCR not found');
    }

    // Get validation rules for workflow
    const validationRules = await localizationProvider.getNCRValidationRules();

    // Validate workflow transition
    if (!validationRules.workflowStates.includes(newStatus)) {
      throw new Error(`Invalid workflow state: ${newStatus}`);
    }

    // Check escalation rules
    const escalationRules = validationRules.escalationRules || [];
    const applicableEscalations = escalationRules.filter(rule => {
      // Simple condition evaluation (can be enhanced with a proper expression evaluator)
      try {
        const condition = rule.condition
          .replace('severity === "CRITICAL"', ncr.severity === 'CRITICAL' ? 'true' : 'false')
          .replace('severity === "HIGH"', ncr.severity === 'HIGH' ? 'true' : 'false')
          .replace('!resolved_within_24h', 'true') // Placeholder - implement time-based logic
          .replace('!resolved_within_48h', 'true'); // Placeholder - implement time-based logic

        return eval(condition);
      } catch {
        return false;
      }
    });

    // Update NCR status
    const updateData: any = {
      status: newStatus,
    };

    if (newStatus === 'CLOSED') {
      updateData.closedAt = new Date();
      updateData.closedById = userId;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const updatedNcr = await prisma.nonConformanceReport.update({
      where: { id: ncrId },
      data: updateData,
    });

    return {
      ncr: updatedNcr,
      escalationsTriggered: applicableEscalations,
    };
  }
}

// Export singleton instance
export const ncrService = new NCRService();