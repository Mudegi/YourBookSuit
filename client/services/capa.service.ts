/**
 * CAPA Service
 * Generic Corrective and Preventive Action service that uses localization strategies
 * for country-specific compliance requirements
 */

import prisma from '@/lib/prisma';
import { localizationProvider } from '@/lib/localization/localization-provider';

export interface CAPACreateData {
  organizationId: string;
  title: string;
  description: string;
  source: 'NCR' | 'AUDIT' | 'CUSTOMER_COMPLAINT' | 'MANAGEMENT_REVIEW' | 'INTERNAL_REVIEW' | 'SUPPLIER_ISSUE' | 'OTHER';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  investigationMethod: 'FIVE_WHY' | 'FISHBONE' | 'PARETO' | 'FMEA' | 'OTHER';
  productId?: string;
  lotNumber?: string;
  vendorId?: string;
  customerId?: string;
  quantity?: number;
  ncrId?: string; // Link to related NCR
  createdById: string;
  assignedToId?: string;
  targetCompletionDate?: Date;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  effectivenessVerification?: string;
  verificationDate?: Date;
  verifiedById?: string;
  notes?: string;
  localData?: any; // JSONB field for country-specific data
}

export interface CAPAUpdateData {
  title?: string;
  description?: string;
  source?: 'NCR' | 'AUDIT' | 'CUSTOMER_COMPLAINT' | 'INTERNAL' | 'SUPPLIER';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  investigationMethod?: 'FIVE_WHY' | 'FISHBONE' | 'PARETO' | 'FMEA' | 'OTHER';
  status?: 'OPEN' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFYING' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';
  productId?: string;
  lotNumber?: string;
  vendorId?: string;
  customerId?: string;
  quantity?: number;
  ncrId?: string;
  assignedToId?: string;
  targetCompletionDate?: Date;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  effectivenessVerification?: string;
  verificationDate?: Date;
  verifiedById?: string;
  closureDate?: Date;
  notes?: string;
  localData?: any;
}

export class CAPAService {
  /**
   * Create a new CAPA with localization-specific validation
   */
  async createCAPA(data: CAPACreateData) {
    // Initialize localization for the organization
    await localizationProvider.initializeOrganizationLocalization(data.organizationId);

    // Get validation rules from localization strategy
    const validationRules = await localizationProvider.getCAPAValidationRules();

    // Validate required fields
    const errors: string[] = [];
    for (const field of validationRules.requiredFields) {
      if (!data[field as keyof CAPACreateData]) {
        errors.push(`${field} is required`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Validate CAPA compliance
    const complianceResult = await localizationProvider.validateCAPACompliance(data);
    if (!complianceResult.isCompliant) {
      throw new Error(`Compliance validation failed: ${complianceResult.errors.join(', ')}`);
    }

    // Generate CAPA number
    const capaNumber = await this.generateCAPANumber(data.organizationId);

    // Create CAPA
    const capa = await prisma.cAPA.create({
      data: {
        organizationId: data.organizationId,
        capaNumber,
        title: data.title,
        description: data.description,
        source: data.source,
        riskLevel: data.riskLevel,
        investigationMethod: data.investigationMethod,
        productId: data.productId,
        lotNumber: data.lotNumber,
        vendorId: data.vendorId,
        customerId: data.customerId,
        quantity: data.quantity,
        ncrId: data.ncrId,
        createdById: data.createdById,
        assignedToId: data.assignedToId,
        targetCompletionDate: data.targetCompletionDate,
        rootCauseAnalysis: data.rootCauseAnalysis,
        correctiveAction: data.correctiveAction,
        preventiveAction: data.preventiveAction,
        effectivenessVerification: data.effectivenessVerification,
        verificationDate: data.verificationDate,
        verifiedById: data.verifiedById,
        notes: data.notes,
        localData: data.localData || {},
        status: 'OPEN',
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        product: true,
        vendor: true,
        customer: true,
        ncr: true,
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return capa;
  }

  /**
   * Update an existing CAPA
   */
  async updateCAPA(id: string, organizationId: string, data: CAPAUpdateData) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    // Get current CAPA
    const existingCAPA = await prisma.cAPA.findFirst({
      where: { id, organizationId },
    });

    if (!existingCAPA) {
      throw new Error('CAPA not found');
    }

    // Validate compliance
    const complianceResult = await localizationProvider.validateCAPACompliance({ ...existingCAPA, ...data });
    if (!complianceResult.isCompliant) {
      throw new Error(`Compliance validation failed: ${complianceResult.errors.join(', ')}`);
    }

    // Update CAPA
    const updatedCAPA = await prisma.cAPA.update({
      where: { id },
      data: {
        ...data,
        closureDate: data.status === 'CLOSED' ? new Date() : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        product: true,
        vendor: true,
        customer: true,
        ncr: true,
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return updatedCAPA;
  }

  /**
   * Get a CAPA by ID
   */
  async getCAPA(id: string, organizationId: string) {
    const capa = await prisma.cAPA.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        product: true,
        vendor: true,
        customer: true,
        ncr: true,
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!capa) {
      throw new Error('CAPA not found');
    }

    return capa;
  }

  /**
   * Get all CAPAs for an organization with filtering
   */
  async getCAPAs(
    organizationId: string,
    filters: {
      status?: 'OPEN' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFYING' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';
      riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      source?: 'NCR' | 'AUDIT' | 'CUSTOMER_COMPLAINT' | 'MANAGEMENT_REVIEW' | 'INTERNAL_REVIEW' | 'SUPPLIER_ISSUE' | 'OTHER';
      assignedToId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const where: any = { organizationId };

    if (filters.status) where.status = filters.status;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.source) where.source = filters.source;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const capas = await prisma.cAPA.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        product: true,
        ncr: {
          select: { id: true, ncrNumber: true, title: true },
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          select: { id: true, title: true, status: true, dueDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return capas;
  }

  /**
   * Get CAPA form configuration based on localization
   */
  async getCAPAFormConfig(organizationId: string) {
    // Initialize localization
    await localizationProvider.initializeOrganizationLocalization(organizationId);

    const validationRules = await localizationProvider.getCAPAValidationRules();
    const regulatoryRequirements = await localizationProvider.getCAPARegulatoryRequirements();
    const translationKeys = await localizationProvider.getCAPATranslationKeys();
    const riskAssessmentRules = await localizationProvider.getRiskAssessmentRules();

    return {
      validationRules,
      regulatoryRequirements,
      translationKeys,
      riskAssessmentRules,
      supportedSources: ['NCR', 'AUDIT', 'COMPLAINT', 'REGULATORY_NON_COMPLIANCE', 'PROCESS_IMPROVEMENT', 'OTHER'],
      supportedRiskLevels: validationRules.riskLevels,
      supportedInvestigationMethods: ['FIVE_WHY', 'FISHBONE', 'PARETO', 'FMEA', 'OTHER'],
      supportedStatuses: validationRules.workflowStates,
    };
  }

  /**
   * Create a CAPA task
   */
  async createCAPATask(
    capaId: string,
    organizationId: string,
    data: {
      title: string;
      description?: string;
      assignedToId: string;
      dueDate?: Date;
      taskType: 'CORRECTIVE' | 'PREVENTIVE' | 'VERIFICATION';
    }
  ) {
    const task = await prisma.capaTask.create({
      data: {
        capaId,
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId,
        dueDate: data.dueDate,
        taskType: data.taskType,
        status: 'OPEN',
        organizationId,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return task;
  }

  /**
   * Update CAPA task status
   */
  async updateCAPATask(
    taskId: string,
    organizationId: string,
    data: {
      status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      notes?: string;
    }
  ) {
    const task = await prisma.capaTask.update({
      where: { id: taskId, organizationId },
      data: {
        ...data,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return task;
  }

  /**
   * Generate CAPA number
   */
  private async generateCAPANumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `CAPA-${currentYear}-`;

    const lastCAPA = await prisma.cAPA.findFirst({
      where: {
        organizationId,
        capaNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { capaNumber: 'desc' },
    });

    let sequenceNumber = 1;
    if (lastCAPA) {
      const lastSequence = parseInt(lastCAPA.capaNumber.split('-')[2]);
      sequenceNumber = lastSequence + 1;
    }

    return `${prefix}${sequenceNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Convert NCR to CAPA automatically
   */
  async convertNCRToCAPA(ncrId: string, organizationId: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM') {
    const ncr = await prisma.nonConformanceReport.findFirst({
      where: { id: ncrId, organizationId },
    });

    if (!ncr) {
      throw new Error('NCR not found');
    }

    // Create CAPA from NCR
    const capaData: CAPACreateData = {
      organizationId,
      title: `CAPA for NCR ${ncr.ncrNumber}: ${ncr.title}`,
      description: ncr.description,
      source: 'NCR',
      riskLevel,
      investigationMethod: 'FIVE_WHY',
      productId: ncr.productId || undefined,
      lotNumber: ncr.lotNumber || undefined,
      vendorId: ncr.vendorId || undefined,
      customerId: ncr.customerId || undefined,
      quantity: ncr.quantity || undefined,
      ncrId: ncr.id,
      createdById: ncr.detectedById,
      assignedToId: ncr.assignedToId || undefined,
      rootCauseAnalysis: ncr.rootCause || undefined,
      notes: `Automatically created from NCR ${ncr.ncrNumber}`,
      localData: ncr.localComplianceData || {},
    };

    return this.createCAPA(capaData);
  }

  /**
   * Get CAPA statistics for dashboard
   */
  async getCAPAStatistics(organizationId: string) {
    const [
      totalCAPAs,
      openCAPAs,
      closedCAPAs,
      overdueCAPAs,
      criticalCAPAs,
      capasByRiskLevel,
      capasBySource,
    ] = await Promise.all([
      prisma.cAPA.count({ where: { organizationId } }),
      prisma.cAPA.count({ where: { organizationId, status: { not: 'CLOSED' } } }),
      prisma.cAPA.count({ where: { organizationId, status: 'CLOSED' } }),
      prisma.cAPA.count({
        where: {
          organizationId,
          status: { not: 'CLOSED' },
          targetCompletionDate: { lt: new Date() },
        },
      }),
      prisma.cAPA.count({ where: { organizationId, riskLevel: 'CRITICAL' } }),
      prisma.cAPA.groupBy({
        by: ['riskLevel'],
        where: { organizationId },
        _count: true,
      }),
      prisma.cAPA.groupBy({
        by: ['source'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    return {
      total: totalCAPAs,
      open: openCAPAs,
      closed: closedCAPAs,
      overdue: overdueCAPAs,
      critical: criticalCAPAs,
      byRiskLevel: capasByRiskLevel.reduce((acc, item) => {
        acc[item.riskLevel] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySource: capasBySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const capaService = new CAPAService();