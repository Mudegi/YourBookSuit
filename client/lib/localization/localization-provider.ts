/**
 * Localization Provider Service
 * Implements strategy pattern for country-specific localization drivers
 * Supports "Global by Design but Localized by Configuration" architecture
 */

import prisma from '@/lib/prisma';
import { SUPPORTED_COUNTRIES } from '../tax/compliance-pack-selector';

export interface LocalizationContext {
  organizationId: string;
  country: string;
  language?: string;
}

export interface LocalizationMetadata {
  apiEndpoints: {
    taxAuthority: string;
    eInvoicing: string;
    taxReturns: string;
    compliance: string;
  };
  taxReturnTemplates: {
    vat: string;
    wht: string;
    paye: string;
    cit: string;
  };
  digitalFiscalization: {
    eInvoicing: boolean;
    qrCodes: boolean;
    digitalSignatures: boolean;
    realTimeReporting: boolean;
  };
  translationKeys: Record<string, string>;
  complianceDrivers: Record<string, any>;
  fiscalCalendar: {
    taxYearStart: string;
    taxPeriods: string[];
    filingDeadlines: Record<string, string>;
  };
  regulatoryBodies: {
    name: string;
    contact: string;
    website: string;
    requirements: string[];
  }[];
}

// Strategy interface for country-specific localization
export interface LocalizationStrategy {
  countryCode: string;

  // Get localization metadata for the country
  getLocalizationMetadata(): Promise<LocalizationMetadata>;

  // Get tax authority API endpoints
  getTaxAuthorityEndpoints(): Promise<{
    baseUrl: string;
    endpoints: Record<string, string>;
    authentication: {
      type: string;
      credentials: string[];
    };
  }>;

  // Get tax return templates and requirements
  getTaxReturnTemplates(): Promise<{
    templates: Record<string, any>;
    validationRules: Record<string, any>;
    filingRequirements: Record<string, any>;
  }>;

  // Get digital fiscalization requirements
  getDigitalFiscalizationConfig(): Promise<{
    eInvoicing: {
      required: boolean;
      format: string;
      provider: string;
      metadata: any;
    };
    qrCodes: {
      required: boolean;
      format: string;
      data: string[];
    };
    digitalSignatures: {
      required: boolean;
      provider: string;
      certificate: string;
    };
  }>;

  // Get translation keys for tax labels
  getTranslationKeys(language: string): Promise<Record<string, string>>;

  // Validate localization configuration
  validateConfiguration(config: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  // NCR-specific localization methods
  getNCRRegulatoryRequirements(): Promise<{
    regulatoryBodies: {
      name: string;
      contact: string;
      website: string;
      requirements: string[];
    }[];
    standards: string[];
    reportingRequirements: {
      mandatory: boolean;
      frequency: string;
      format: string;
      authorities: string[];
    };
    complianceFields: string[];
  }>;

  getNCRValidationRules(): Promise<{
    severityLevels: string[];
    requiredFields: string[];
    customFields: {
      name: string;
      type: string;
      required: boolean;
      validation?: any;
    }[];
    workflowStates: string[];
    escalationRules: {
      condition: string;
      action: string;
      notify: string[];
    }[];
  }>;

  getNCRTranslationKeys(language: string): Promise<Record<string, string>>;

  validateNCRCompliance(ncrData: any): Promise<{
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }>;

  // CAPA-specific localization methods
  getCAPARegulatoryRequirements(): Promise<{
    regulatoryBodies: {
      name: string;
      contact: string;
      website: string;
      requirements: string[];
    }[];
    standards: string[];
    reportingRequirements: {
      mandatory: boolean;
      frequency: string;
      format: string;
      authorities: string[];
    };
    complianceFields: string[];
  }>;

  getCAPAValidationRules(): Promise<{
    riskLevels: string[];
    investigationMethods: string[];
    requiredFields: string[];
    customFields: {
      name: string;
      type: string;
      required: boolean;
      validation?: any;
    }[];
    workflowStates: string[];
    escalationRules: {
      condition: string;
      action: string;
      notify: string[];
    }[];
  }>;

  getCAPATranslationKeys(language: string): Promise<Record<string, string>>;

  validateCAPACompliance(capaData: any): Promise<{
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }>;

  getRiskAssessmentRules(): Promise<{
    riskMatrix: {
      likelihood: string[];
      impact: string[];
      riskLevels: Record<string, { min: number; max: number; actions: string[] }>;
    };
    assessmentCriteria: {
      financial: string[];
      operational: string[];
      compliance: string[];
      reputational: string[];
    };
    requiredEvidenceCodes: string[];
  }>;
}

// Registry for localization strategies
class LocalizationStrategyRegistry {
  private strategies: Map<string, LocalizationStrategy> = new Map();

  register(strategy: LocalizationStrategy) {
    this.strategies.set(strategy.countryCode, strategy);
  }

  get(countryCode: string): LocalizationStrategy | null {
    return this.strategies.get(countryCode) || null;
  }

  getAll(): LocalizationStrategy[] {
    return Array.from(this.strategies.values());
  }

  getSupportedCountries(): string[] {
    return Array.from(this.strategies.keys());
  }
}

const strategyRegistry = new LocalizationStrategyRegistry();

// Base localization strategy class
export abstract class BaseLocalizationStrategy implements LocalizationStrategy {
  abstract countryCode: string;

  async getLocalizationMetadata(): Promise<LocalizationMetadata> {
    // Default implementation - should be overridden by country-specific strategies
    return {
      apiEndpoints: {
        taxAuthority: '',
        eInvoicing: '',
        taxReturns: '',
        compliance: '',
      },
      taxReturnTemplates: {
        vat: '',
        wht: '',
        paye: '',
        cit: '',
      },
      digitalFiscalization: {
        eInvoicing: false,
        qrCodes: false,
        digitalSignatures: false,
        realTimeReporting: false,
      },
      translationKeys: {},
      complianceDrivers: {},
      fiscalCalendar: {
        taxYearStart: '01-01',
        taxPeriods: ['monthly', 'quarterly', 'annually'],
        filingDeadlines: {},
      },
      regulatoryBodies: [],
    };
  }

  async getTaxAuthorityEndpoints(): Promise<{
    baseUrl: string;
    endpoints: Record<string, string>;
    authentication: { type: string; credentials: string[] };
  }> {
    throw new Error(`Tax authority endpoints not implemented for ${this.countryCode}`);
  }

  async getTaxReturnTemplates(): Promise<{
    templates: Record<string, any>;
    validationRules: Record<string, any>;
    filingRequirements: Record<string, any>;
  }> {
    throw new Error(`Tax return templates not implemented for ${this.countryCode}`);
  }

  async getDigitalFiscalizationConfig(): Promise<{
    eInvoicing: { required: boolean; format: string; provider: string; metadata: any };
    qrCodes: { required: boolean; format: string; data: string[] };
    digitalSignatures: { required: boolean; provider: string; certificate: string };
  }> {
    return {
      eInvoicing: {
        required: false,
        format: '',
        provider: '',
        metadata: {},
      },
      qrCodes: {
        required: false,
        format: '',
        data: [],
      },
      digitalSignatures: {
        required: false,
        provider: '',
        certificate: '',
      },
    };
  }

  async getTranslationKeys(language: string): Promise<Record<string, string>> {
    // Default English translations
    return {
      'tax.vat': 'VAT',
      'tax.wht': 'Withholding Tax',
      'tax.paye': 'PAYE',
      'tax.cit': 'Corporate Income Tax',
      'invoice.number': 'Invoice Number',
      'invoice.date': 'Invoice Date',
      'invoice.amount': 'Amount',
      'invoice.tax': 'Tax',
      'invoice.total': 'Total',
    };
  }

  async validateConfiguration(config: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  // NCR-specific default implementations
  async getNCRRegulatoryRequirements(): Promise<{
    regulatoryBodies: {
      name: string;
      contact: string;
      website: string;
      requirements: string[];
    }[];
    standards: string[];
    reportingRequirements: {
      mandatory: boolean;
      frequency: string;
      format: string;
      authorities: string[];
    };
    complianceFields: string[];
  }> {
    return {
      regulatoryBodies: [],
      standards: ['ISO 9001'],
      reportingRequirements: {
        mandatory: false,
        frequency: 'as-needed',
        format: 'internal',
        authorities: [],
      },
      complianceFields: [],
    };
  }

  async getNCRValidationRules(): Promise<{
    severityLevels: string[];
    requiredFields: string[];
    customFields: {
      name: string;
      type: string;
      required: boolean;
      validation?: any;
    }[];
    workflowStates: string[];
    escalationRules: {
      condition: string;
      action: string;
      notify: string[];
    }[];
  }> {
    return {
      severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      requiredFields: ['title', 'description', 'source', 'severity', 'status', 'detectedDate', 'detectedById'],
      customFields: [],
      workflowStates: ['OPEN', 'UNDER_INVESTIGATION', 'CONTAINED', 'CLOSED'],
      escalationRules: [],
    };
  }

  async getNCRTranslationKeys(language: string): Promise<Record<string, string>> {
    return {
      'ncr.title': 'Non-Conformance Report',
      'ncr.number': 'NCR Number',
      'ncr.description': 'Description',
      'ncr.severity': 'Severity',
      'ncr.status': 'Status',
      'ncr.source': 'Source',
      'ncr.rootCause': 'Root Cause',
      'ncr.containmentAction': 'Containment Action',
      'ncr.correctiveAction': 'Corrective Action',
      'ncr.preventiveAction': 'Preventive Action',
    };
  }

  async validateNCRCompliance(ncrData: any): Promise<{
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (!ncrData.title) errors.push('NCR title is required');
    if (!ncrData.description) errors.push('NCR description is required');
    if (!ncrData.source) errors.push('NCR source is required');
    if (!ncrData.severity) errors.push('NCR severity is required');

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  // CAPA-specific default implementations
  async getCAPARegulatoryRequirements(): Promise<{
    regulatoryBodies: {
      name: string;
      contact: string;
      website: string;
      requirements: string[];
    }[];
    standards: string[];
    reportingRequirements: {
      mandatory: boolean;
      frequency: string;
      format: string;
      authorities: string[];
    };
    complianceFields: string[];
  }> {
    return {
      regulatoryBodies: [],
      standards: ['ISO 9001'],
      reportingRequirements: {
        mandatory: false,
        frequency: 'as-needed',
        format: 'internal',
        authorities: [],
      },
      complianceFields: [],
    };
  }

  async getCAPAValidationRules(): Promise<{
    riskLevels: string[];
    investigationMethods: string[];
    requiredFields: string[];
    customFields: {
      name: string;
      type: string;
      required: boolean;
      validation?: any;
    }[];
    workflowStates: string[];
    escalationRules: {
      condition: string;
      action: string;
      notify: string[];
    }[];
  }> {
    return {
      riskLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      investigationMethods: ['FISHBONE', '5_WHY', 'PARETO', 'FMEA', 'CUSTOM'],
      requiredFields: ['title', 'description', 'source', 'riskLevel', 'investigationMethod', 'status', 'createdDate', 'createdById'],
      customFields: [],
      workflowStates: ['OPEN', 'UNDER_INVESTIGATION', 'ACTIONS_PLANNED', 'ACTIONS_IMPLEMENTED', 'VERIFICATION_PENDING', 'CLOSED'],
      escalationRules: [],
    };
  }

  async getCAPATranslationKeys(language: string): Promise<Record<string, string>> {
    return {
      'capa.title': 'Corrective and Preventive Action',
      'capa.number': 'CAPA Number',
      'capa.description': 'Description',
      'capa.riskLevel': 'Risk Level',
      'capa.status': 'Status',
      'capa.source': 'Source',
      'capa.rootCause': 'Root Cause Analysis',
      'capa.correctiveAction': 'Corrective Action',
      'capa.preventiveAction': 'Preventive Action',
      'capa.effectivenessVerification': 'Effectiveness Verification',
    };
  }

  async validateCAPACompliance(capaData: any): Promise<{
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (!capaData.title) errors.push('CAPA title is required');
    if (!capaData.description) errors.push('CAPA description is required');
    if (!capaData.source) errors.push('CAPA source is required');
    if (!capaData.riskLevel) errors.push('CAPA risk level is required');

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  async getRiskAssessmentRules(): Promise<{
    riskMatrix: {
      likelihood: string[];
      impact: string[];
      riskLevels: Record<string, { min: number; max: number; actions: string[] }>;
    };
    assessmentCriteria: {
      financial: string[];
      operational: string[];
      compliance: string[];
      reputational: string[];
    };
    requiredEvidenceCodes: string[];
  }> {
    return {
      riskMatrix: {
        likelihood: ['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN'],
        impact: ['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC'],
        riskLevels: {
          LOW: { min: 1, max: 6, actions: ['Monitor', 'Document'] },
          MEDIUM: { min: 7, max: 12, actions: ['Plan mitigation', 'Assign responsibility'] },
          HIGH: { min: 13, max: 20, actions: ['Immediate action required', 'Senior management review'] },
          CRITICAL: { min: 21, max: 25, actions: ['Emergency response', 'Board-level notification'] },
        },
      },
      assessmentCriteria: {
        financial: ['Cost impact', 'Revenue loss', 'Budget variance'],
        operational: ['Process disruption', 'Resource utilization', 'Timeline delay'],
        compliance: ['Regulatory violation', 'Contract breach', 'Standard non-compliance'],
        reputational: ['Customer satisfaction', 'Brand damage', 'Stakeholder trust'],
      },
      requiredEvidenceCodes: ['DOC', 'REC', 'OBS', 'INT', 'ANA'],
    };
  }
}

// Import and register all localization drivers
import './drivers/index';

// Main Localization Provider Service
export class LocalizationProvider {
  private static instance: LocalizationProvider;
  private currentStrategy: LocalizationStrategy | null = null;

  private constructor() {}

  static getInstance(): LocalizationProvider {
    if (!LocalizationProvider.instance) {
      LocalizationProvider.instance = new LocalizationProvider();
    }
    return LocalizationProvider.instance;
  }

  // Register a localization strategy
  registerStrategy(strategy: LocalizationStrategy) {
    strategyRegistry.register(strategy);
  }

  // Set the current localization strategy based on country
  async setLocalizationStrategy(context: LocalizationContext): Promise<void> {
    const strategy = strategyRegistry.get(context.country);
    if (!strategy) {
      throw new Error(`Localization strategy not found for country: ${context.country}`);
    }
    this.currentStrategy = strategy;
  }

  // Get current localization strategy
  getCurrentStrategy(): LocalizationStrategy | null {
    return this.currentStrategy;
  }

  // Get localization metadata for current strategy
  async getLocalizationMetadata(): Promise<LocalizationMetadata> {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getLocalizationMetadata();
  }

  // Get tax authority endpoints
  async getTaxAuthorityEndpoints() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getTaxAuthorityEndpoints();
  }

  // Get tax return templates
  async getTaxReturnTemplates() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getTaxReturnTemplates();
  }

  // Get digital fiscalization config
  async getDigitalFiscalizationConfig() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getDigitalFiscalizationConfig();
  }

  // Get translation keys
  async getTranslationKeys(language: string = 'en'): Promise<Record<string, string>> {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getTranslationKeys(language);
  }

  // Validate configuration
  async validateConfiguration(config: any) {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.validateConfiguration(config);
  }

  // NCR-specific methods
  async getNCRRegulatoryRequirements() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getNCRRegulatoryRequirements();
  }

  async getNCRValidationRules() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getNCRValidationRules();
  }

  async getNCRTranslationKeys(language: string = 'en'): Promise<Record<string, string>> {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getNCRTranslationKeys(language);
  }

  async validateNCRCompliance(ncrData: any) {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.validateNCRCompliance(ncrData);
  }

  // CAPA-specific methods
  async getCAPARegulatoryRequirements() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getCAPARegulatoryRequirements();
  }

  async getCAPAValidationRules() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getCAPAValidationRules();
  }

  async getCAPATranslationKeys(language: string = 'en'): Promise<Record<string, string>> {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getCAPATranslationKeys(language);
  }

  async validateCAPACompliance(capaData: any) {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.validateCAPACompliance(capaData);
  }

  async getRiskAssessmentRules() {
    if (!this.currentStrategy) {
      throw new Error('No localization strategy set');
    }
    return this.currentStrategy.getRiskAssessmentRules();
  }

  // Get supported countries
  getSupportedCountries(): string[] {
    return strategyRegistry.getSupportedCountries();
  }

  // Initialize localization for an organization
  async initializeOrganizationLocalization(organizationId: string): Promise<void> {
    try {
      // Get organization's localization config
      const localizationConfig = await prisma.localizationConfig.findUnique({
        where: { organizationId },
      });

      if (!localizationConfig) {
        // Create default localization config for the organization
        const defaultConfig = await prisma.localizationConfig.create({
          data: {
            organizationId,
            country: 'UG', // Default to Uganda
            language: 'en',
          },
        });

        // Set the localization strategy with default config
        await this.setLocalizationStrategy({
          organizationId,
          country: defaultConfig.country,
          language: defaultConfig.language,
        });
        return;
      }

      // Set the localization strategy
      await this.setLocalizationStrategy({
        organizationId,
        country: localizationConfig.country,
        language: localizationConfig.language,
      });
    } catch (error) {
      console.error('Error initializing organization localization:', error);
      // Fallback to default strategy
      await this.setLocalizationStrategy({
        organizationId,
        country: 'UG',
        language: 'en',
      });
    }
  }

  // Journal Entry Localization Methods
  
  /**
   * Get country-specific journal entry metadata
   * Supports compliance flags and formatting rules
   */
  async getEntryMetadata(context: LocalizationContext): Promise<{
    complianceFlags: Record<string, any>;
    displayRules: {
      currencyFormat: string;
      dateFormat: string;
      amountPrecision: number;
      showForeignCurrency: boolean;
    };
    validationRules: {
      requiredFields: string[];
      balanceCheckRequired: boolean;
      attachmentRules: {
        required: boolean;
        maxSize: number;
        allowedTypes: string[];
      };
      approvalWorkflow: {
        required: boolean;
        levels: number;
        amountThresholds: Record<string, number>;
      };
    };
    auditTrailRequirements: {
      trackAllChanges: boolean;
      retentionPeriod: number; // in years
      immutableAfterPosting: boolean;
    };
  }> {
    // Build entry-specific metadata based on country
    return {
      complianceFlags: this.buildComplianceFlags(context.country, {} as LocalizationMetadata),
      displayRules: this.buildDisplayRules(context.country),
      validationRules: this.buildValidationRules(context.country, {} as LocalizationMetadata),
      auditTrailRequirements: this.buildAuditTrailRequirements(context.country),
    };
  }

  /**
   * Build country-specific compliance flags for journal entries
   */
  private buildComplianceFlags(country: string, metadata: LocalizationMetadata): Record<string, any> {
    const flags: Record<string, any> = {};

    switch (country) {
      case 'UG': // Uganda
        flags.vatTracking = {
          required: true,
          rateValidation: true,
          uraCompliance: true,
          efrisIntegration: metadata.digitalFiscalization?.eInvoicing || false,
        };
        flags.witholdingTax = {
          tracking: true,
          rates: [0.06, 0.1, 0.15], // Common WHT rates in Uganda
          certificationRequired: true,
        };
        flags.foreignExchange = {
          trackingRequired: true,
          bankOfUgandaRates: true,
          documentationRequired: true,
        };
        break;

      case 'KE': // Kenya
        flags.vatTracking = {
          required: true,
          rateValidation: true,
          kraCompliance: true,
          etimsIntegration: metadata.digitalFiscalization?.eInvoicing || false,
        };
        flags.witholdingTax = {
          tracking: true,
          rates: [0.05, 0.1, 0.2, 0.3], // Common WHT rates in Kenya
          certificationRequired: true,
        };
        break;

      case 'TZ': // Tanzania
        flags.vatTracking = {
          required: true,
          rateValidation: true,
          traCompliance: true,
          vfdIntegration: metadata.digitalFiscalization?.eInvoicing || false,
        };
        break;

      case 'US': // United States
        flags.gaapCompliance = {
          required: true,
          fasb: true,
          auditTrail: true,
        };
        flags.taxCompliance = {
          irs: true,
          stateCompliance: true,
        };
        break;

      default:
        // Global defaults
        flags.basicCompliance = {
          balanceRequired: true,
          auditTrail: true,
          documentationRequired: false,
        };
    }

    return flags;
  }

  /**
   * Build country-specific display rules
   */
  private buildDisplayRules(country: string) {
    const rules = {
      currencyFormat: 'en-US',
      dateFormat: 'MM/dd/yyyy',
      amountPrecision: 2,
      showForeignCurrency: false,
    };

    switch (country) {
      case 'UG':
        rules.currencyFormat = 'en-UG';
        rules.dateFormat = 'dd/MM/yyyy';
        rules.showForeignCurrency = true;
        break;
      case 'KE':
        rules.currencyFormat = 'sw-KE';
        rules.dateFormat = 'dd/MM/yyyy';
        rules.showForeignCurrency = true;
        break;
      case 'GB':
        rules.currencyFormat = 'en-GB';
        rules.dateFormat = 'dd/MM/yyyy';
        rules.amountPrecision = 2;
        break;
    }

    return rules;
  }

  /**
   * Build country-specific validation rules
   */
  private buildValidationRules(country: string, metadata: LocalizationMetadata) {
    const rules = {
      requiredFields: ['transactionDate', 'description', 'amount'],
      balanceCheckRequired: true,
      attachmentRules: {
        required: false,
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'png', 'doc', 'docx'],
      },
      approvalWorkflow: {
        required: false,
        levels: 1,
        amountThresholds: {},
      },
    };

    switch (country) {
      case 'UG':
        rules.requiredFields.push('taxAmount');
        rules.attachmentRules.required = true;
        rules.approvalWorkflow.required = true;
        rules.approvalWorkflow.levels = 2;
        rules.approvalWorkflow.amountThresholds = {
          level1: 1000000, // UGX 1M
          level2: 5000000, // UGX 5M
        };
        break;

      case 'KE':
        rules.requiredFields.push('taxAmount', 'vatRate');
        rules.attachmentRules.required = true;
        rules.approvalWorkflow.required = true;
        break;

      case 'US':
        rules.requiredFields.push('taxCategory');
        rules.approvalWorkflow.required = true;
        rules.approvalWorkflow.amountThresholds = {
          level1: 10000, // USD 10K
          level2: 50000, // USD 50K
        };
        break;
    }

    return rules;
  }

  /**
   * Build country-specific audit trail requirements
   */
  private buildAuditTrailRequirements(country: string) {
    const requirements = {
      trackAllChanges: true,
      retentionPeriod: 7, // years
      immutableAfterPosting: true,
    };

    switch (country) {
      case 'UG':
        requirements.retentionPeriod = 6; // Uganda tax law requirement
        requirements.immutableAfterPosting = true;
        break;
      case 'KE':
        requirements.retentionPeriod = 5; // Kenya tax law requirement
        break;
      case 'US':
        requirements.retentionPeriod = 7; // IRS requirement
        break;
    }

    return requirements;
  }

  /**
   * Validate journal entry compliance based on country rules
   */
  async validateJournalEntryCompliance(
    context: LocalizationContext, 
    entryData: any
  ): Promise<{
    isCompliant: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const metadata = await this.getEntryMetadata(context);
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate required fields
    for (const field of metadata.validationRules.requiredFields) {
      if (!entryData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate balance
    if (metadata.validationRules.balanceCheckRequired) {
      const debits = entryData.ledgerEntries?.filter((e: any) => e.entryType === 'DEBIT') || [];
      const credits = entryData.ledgerEntries?.filter((e: any) => e.entryType === 'CREDIT') || [];
      
      const debitTotal = debits.reduce((sum: number, e: any) => sum + e.amount, 0);
      const creditTotal = credits.reduce((sum: number, e: any) => sum + e.amount, 0);
      
      if (Math.abs(debitTotal - creditTotal) > 0.01) {
        errors.push('Journal entry is not balanced (Debits ≠ Credits)');
      }
    }

    // Validate attachments
    if (metadata.validationRules.attachmentRules.required) {
      if (!entryData.attachments || entryData.attachments.length === 0) {
        if (context.country === 'UG') {
          errors.push('Supporting documents required for URA compliance');
        } else {
          warnings.push('Recommended to attach supporting documents');
        }
      }
    }

    // Country-specific validations
    if (context.country === 'UG') {
      // Uganda-specific VAT validation
      if (entryData.taxAmount > 0) {
        const vatAccounts = entryData.ledgerEntries?.filter((e: any) => 
          e.account.code.includes('VAT') || e.account.name.toLowerCase().includes('vat')
        ) || [];
        
        if (vatAccounts.length === 0) {
          warnings.push('VAT amount specified but no VAT accounts found');
        }
      }
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  // Update localization configuration
  async updateLocalizationConfig(
    organizationId: string,
    updates: Partial<{
      country: string;
      language: string;
      apiEndpoints: any;
      taxReturnTemplates: any;
      digitalFiscalization: any;
      translationKeys: any;
      complianceDrivers: any;
      fiscalCalendar: any;
      regulatoryBodies: any;
    }>
  ): Promise<void> {
    // Update the database
    await prisma.localizationConfig.update({
      where: { organizationId },
      data: updates,
    });

    // If country changed, update the strategy
    if (updates.country) {
      await this.setLocalizationStrategy({
        organizationId,
        country: updates.country,
        language: updates.language,
      });
    }
  }

  /**
   * Get localized tax ID label (e.g., "TIN" for Uganda, "EIN" for US)
   */
  async getTaxIdLabel(countryCode: string): Promise<string> {
    const labels: Record<string, string> = {
      UG: 'TIN', // Tax Identification Number (Uganda)
      KE: 'KRA PIN', // Kenya Revenue Authority PIN
      TZ: 'TIN', // Tax Identification Number (Tanzania)
      US: 'EIN', // Employer Identification Number
      GB: 'VAT Registration Number',
      CA: 'Business Number',
      AU: 'ABN', // Australian Business Number
      IN: 'GSTIN', // Goods and Services Tax Identification Number
      ZA: 'Tax Reference Number',
      NG: 'TIN', // Tax Identification Number (Nigeria)
      GH: 'TIN', // Tax Identification Number (Ghana)
      ZM: 'TPIN', // Taxpayer Identification Number (Zambia)
      RW: 'TIN', // Tax Identification Number (Rwanda)
    };

    return labels[countryCode] || 'Tax ID';
  }

  /**
   * Validate tax ID format based on country rules
   */
  async validateTaxId(taxId: string, countryCode: string): Promise<boolean> {
    if (!taxId || !taxId.trim()) {
      return false;
    }

    const cleanId = taxId.trim().toUpperCase();

    // Country-specific validation patterns
    const patterns: Record<string, RegExp> = {
      // Uganda TIN: 10 digits
      UG: /^\d{10}$/,
      
      // Kenya KRA PIN: Letter followed by 9 digits and letter (e.g., A123456789Z)
      KE: /^[A-Z]\d{9}[A-Z]$/,
      
      // Tanzania TIN: 9 digits followed by letter
      TZ: /^\d{9}[A-Z]$/,
      
      // US EIN: XX-XXXXXXX format
      US: /^\d{2}-?\d{7}$/,
      
      // UK VAT: GB followed by 9 or 12 digits
      GB: /^GB\d{9}(GB\d{3})?$/,
      
      // Canada Business Number: 9 digits
      CA: /^\d{9}$/,
      
      // Australia ABN: 11 digits
      AU: /^\d{11}$/,
      
      // India GSTIN: 15 alphanumeric characters
      IN: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,
      
      // South Africa Tax Reference: 10 digits
      ZA: /^\d{10}$/,
      
      // Nigeria TIN: 8-11 digits
      NG: /^\d{8,11}$/,
      
      // Ghana TIN: Letter followed by 10-13 digits
      GH: /^[A-Z]\d{10,13}$/,
      
      // Zambia TPIN: 10 digits
      ZM: /^\d{10}$/,
      
      // Rwanda TIN: 9 digits
      RW: /^\d{9}$/,
    };

    const pattern = patterns[countryCode];
    if (!pattern) {
      // No validation pattern defined - accept any non-empty value
      return true;
    }

    return pattern.test(cleanId);
  }

  /**
   * Get tax ID validation error message
   */
  async getTaxIdValidationMessage(countryCode: string): Promise<string> {
    const messages: Record<string, string> = {
      UG: 'TIN must be 10 digits (e.g., 1234567890)',
      KE: 'KRA PIN must be in format: Letter + 9 digits + Letter (e.g., A123456789Z)',
      TZ: 'TIN must be 9 digits followed by a letter (e.g., 123456789A)',
      US: 'EIN must be in format: XX-XXXXXXX (e.g., 12-3456789)',
      GB: 'VAT Registration Number must be GB followed by 9 or 12 digits',
      CA: 'Business Number must be 9 digits',
      AU: 'ABN must be 11 digits',
      IN: 'GSTIN must be 15 alphanumeric characters in the specified format',
      ZA: 'Tax Reference Number must be 10 digits',
      NG: 'TIN must be 8-11 digits',
      GH: 'TIN must be a letter followed by 10-13 digits',
      ZM: 'TPIN must be 10 digits',
      RW: 'TIN must be 9 digits',
    };

    return messages[countryCode] || 'Invalid tax ID format';
  }

  /**
   * Get address field requirements for country
   */
  async getAddressFields(countryCode: string): Promise<{
    required: string[];
    optional: string[];
    labels: Record<string, string>;
  }> {
    // East African countries (Uganda, Kenya, Tanzania) use District/Region
    if (['UG', 'KE', 'TZ'].includes(countryCode)) {
      return {
        required: ['street', 'city', 'country'],
        optional: ['street2', 'district', 'region', 'postalCode'],
        labels: {
          street: 'Street Address',
          street2: 'Street Address Line 2',
          city: 'City/Town',
          district: 'District',
          region: 'Region',
          postalCode: 'Postal Code',
          country: 'Country',
        },
      };
    }

    // Standard US/EU format
    return {
      required: ['street', 'city', 'state', 'postalCode', 'country'],
      optional: ['street2'],
      labels: {
        street: 'Street Address',
        street2: 'Street Address Line 2 (Optional)',
        city: 'City',
        state: 'State/Province',
        postalCode: 'Postal/ZIP Code',
        country: 'Country',
      },
    };
  }

  /**
   * Get payment terms options for country
   */
  async getPaymentTermsOptions(countryCode: string): Promise<
    Array<{ value: number; label: string; description: string }>
  > {
    // Common payment terms across all countries
    const commonTerms = [
      { value: 0, label: 'Due on Receipt', description: 'Payment due immediately' },
      { value: 7, label: 'Net 7', description: 'Payment due within 7 days' },
      { value: 15, label: 'Net 15', description: 'Payment due within 15 days' },
      { value: 30, label: 'Net 30', description: 'Payment due within 30 days' },
      { value: 45, label: 'Net 45', description: 'Payment due within 45 days' },
      { value: 60, label: 'Net 60', description: 'Payment due within 60 days' },
      { value: 90, label: 'Net 90', description: 'Payment due within 90 days' },
    ];

    // Country-specific terms can be added here
    if (countryCode === 'UG') {
      // Uganda often uses government payment terms
      return [
        ...commonTerms,
        { value: 120, label: 'Net 120 (Gov)', description: 'Government contracts - 120 days' },
      ];
    }

    return commonTerms;
  }
}

// Export singleton instance
export const localizationProvider = LocalizationProvider.getInstance();