/**
 * CAPA Service Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { capaService } from '../capa.service';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    cAPA: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    capaTask: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    nonConformanceReport: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/localization/localization-provider', () => ({
  localizationProvider: {
    initializeOrganizationLocalization: jest.fn(),
    getCAPAValidationRules: jest.fn(),
    validateCAPACompliance: jest.fn(),
    getCAPAFormConfig: jest.fn(),
  },
}));

describe('CAPAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCAPA', () => {
    it('should create a CAPA successfully', async () => {
      // Mock the localization provider
      const mockLocalizationProvider = require('@/lib/localization/localization-provider').localizationProvider;
      mockLocalizationProvider.initializeOrganizationLocalization.mockResolvedValue(undefined);
      mockLocalizationProvider.getCAPAValidationRules.mockResolvedValue({
        requiredFields: ['title', 'description', 'source', 'riskLevel'],
      });
      mockLocalizationProvider.validateCAPACompliance.mockResolvedValue({
        isCompliant: true,
        errors: [],
        warnings: [],
        recommendations: [],
      });

      // Mock Prisma
      const mockPrisma = require('@/lib/prisma').default;
      mockPrisma.cAPA.create.mockResolvedValue({
        id: 'capa-1',
        capaNumber: 'CAPA-2024-0001',
        title: 'Test CAPA',
        description: 'Test description',
        source: 'NCR',
        riskLevel: 'MEDIUM',
        investigationMethod: 'FIVE_WHY',
        status: 'OPEN',
        createdBy: { id: 'user-1', name: 'Test User' },
      });

      const result = await capaService.createCAPA({
        organizationId: 'org-1',
        title: 'Test CAPA',
        description: 'Test description',
        source: 'NCR',
        riskLevel: 'MEDIUM',
        investigationMethod: 'FIVE_WHY',
        createdById: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.capaNumber).toBe('CAPA-2024-0001');
      expect(mockLocalizationProvider.initializeOrganizationLocalization).toHaveBeenCalledWith('org-1');
      expect(mockPrisma.cAPA.create).toHaveBeenCalled();
    });

    it('should throw error for validation failures', async () => {
      const mockLocalizationProvider = require('@/lib/localization/localization-provider').localizationProvider;
      mockLocalizationProvider.initializeOrganizationLocalization.mockResolvedValue(undefined);
      mockLocalizationProvider.getCAPAValidationRules.mockResolvedValue({
        requiredFields: ['title', 'description'],
      });
      mockLocalizationProvider.validateCAPACompliance.mockResolvedValue({
        isCompliant: false,
        errors: ['Title is required'],
        warnings: [],
        recommendations: [],
      });

      await expect(capaService.createCAPA({
        organizationId: 'org-1',
        title: '',
        description: 'Test description',
        source: 'NCR',
        riskLevel: 'MEDIUM',
        investigationMethod: 'FIVE_WHY',
        createdById: 'user-1',
      })).rejects.toThrow('Compliance validation failed');
    });
  });

  describe('getCAPAFormConfig', () => {
    it('should return form configuration', async () => {
      const mockLocalizationProvider = require('@/lib/localization/localization-provider').localizationProvider;
      mockLocalizationProvider.initializeOrganizationLocalization.mockResolvedValue(undefined);
      mockLocalizationProvider.getCAPAValidationRules.mockResolvedValue({
        riskLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        investigationMethods: ['FIVE_WHY', 'FISHBONE', 'PARETO', 'FMEA', 'OTHER'],
        requiredFields: ['title', 'description'],
        workflowStates: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      });
      mockLocalizationProvider.getCAPARegulatoryRequirements.mockResolvedValue({
        regulatoryBodies: [],
        standards: ['ISO 9001'],
        reportingRequirements: { mandatory: false, frequency: 'as-needed', format: 'internal', authorities: [] },
        complianceFields: [],
      });
      mockLocalizationProvider.getCAPATranslationKeys.mockResolvedValue({
        'capa.title': 'Corrective and Preventive Action',
      });
      mockLocalizationProvider.getRiskAssessmentRules.mockResolvedValue({
        riskMatrix: {
          likelihood: ['RARE', 'LIKELY'],
          impact: ['LOW', 'HIGH'],
          riskLevels: {},
        },
        assessmentCriteria: { financial: [], operational: [], compliance: [], reputational: [] },
        requiredEvidenceCodes: ['DOC', 'REC'],
      });

      const config = await capaService.getCAPAFormConfig('org-1');

      expect(config).toBeDefined();
      expect(config.validationRules.riskLevels).toContain('LOW');
      expect(config.supportedSources).toContain('NCR');
    });
  });
});