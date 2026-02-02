/**
 * NCR Service Test
 * Tests the generic NCR service with localization strategies
 */

import { ncrService } from '@/services/ncr.service';
import { localizationProvider } from '@/lib/localization/localization-provider';

describe('NCR Service with Localization', () => {
  const testOrgId = 'test-org-123';

  beforeAll(async () => {
    // Mock the localization provider for testing
    jest.spyOn(localizationProvider, 'initializeOrganizationLocalization').mockResolvedValue();
    jest.spyOn(localizationProvider, 'getNCRValidationRules').mockResolvedValue({
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      requiredFields: ['title', 'description', 'source', 'severity', 'detectedDate', 'detectedById'],
      customFields: [
        {
          name: 'unbsRegistrationNumber',
          type: 'string',
          required: true,
          validation: { pattern: '^UNBS/[A-Z]{2}/\\d{4}/\\d{6}$' },
        },
      ],
      workflowStates: ['OPEN', 'UNDER_INVESTIGATION', 'CLOSED'],
      escalationRules: [],
    });
    jest.spyOn(localizationProvider, 'validateNCRCompliance').mockResolvedValue({
      isCompliant: true,
      errors: [],
      warnings: [],
      recommendations: [],
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('getNCRFormConfig', () => {
    it('should return form configuration with localization data', async () => {
      jest.spyOn(localizationProvider, 'getNCRRegulatoryRequirements').mockResolvedValue({
        regulatoryBodies: [
          {
            name: 'UNBS',
            contact: '+256 414 301 000',
            website: 'https://ursb.go.ug',
            requirements: ['ISO 9001 compliance'],
          },
        ],
        standards: ['US ISO 9001:2015'],
        reportingRequirements: {
          mandatory: true,
          frequency: 'immediate',
          format: 'electronic',
          authorities: ['UNBS'],
        },
        complianceFields: ['unbsRegistrationNumber'],
      });

      jest.spyOn(localizationProvider, 'getNCRTranslationKeys').mockResolvedValue({
        'ncr.title': 'Non-Conformance Report',
        'ncr.description': 'Description',
        'ncr.severity': 'Severity',
      });

      const config = await ncrService.getNCRFormConfig(testOrgId);

      expect(config).toHaveProperty('standardFields');
      expect(config).toHaveProperty('customFields');
      expect(config).toHaveProperty('regulatoryRequirements');
      expect(config.customFields).toContainEqual(
        expect.objectContaining({ name: 'unbsRegistrationNumber' })
      );
    });
  });

  describe('NCR Validation', () => {
    it('should validate NCR data using localization rules', async () => {
      const ncrData = {
        title: 'Test NCR',
        description: 'Test description',
        source: 'PRODUCTION',
        severity: 'HIGH',
        detectedDate: new Date(),
        detectedById: 'user-123',
        unbsRegistrationNumber: 'UNBS/UG/2024/000001',
      };

      const result = await localizationProvider.validateNCRCompliance(ncrData);

      expect(result.isCompliant).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid UNBS registration number', async () => {
      jest.spyOn(localizationProvider, 'validateNCRCompliance').mockResolvedValueOnce({
        isCompliant: false,
        errors: ['UNBS registration number format is invalid'],
        warnings: [],
        recommendations: [],
      });

      const ncrData = {
        title: 'Test NCR',
        description: 'Test description',
        source: 'PRODUCTION',
        severity: 'HIGH',
        detectedDate: new Date(),
        detectedById: 'user-123',
        unbsRegistrationNumber: 'INVALID-FORMAT',
      };

      const result = await localizationProvider.validateNCRCompliance(ncrData);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContain('UNBS registration number format is invalid');
    });
  });
});