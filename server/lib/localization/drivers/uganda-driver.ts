/**
 * Uganda Localization Driver
 * Implements Uganda-specific localization requirements for URA compliance
 */

import { BaseLocalizationStrategy, LocalizationMetadata } from '../localization-provider';

export class UgandaLocalizationStrategy extends BaseLocalizationStrategy {
  countryCode = 'UG';

  async getLocalizationMetadata(): Promise<LocalizationMetadata> {
    return {
      apiEndpoints: {
        taxAuthority: 'https://ursb.go.ug',
        eInvoicing: 'https://efris.ursb.go.ug',
        taxReturns: 'https://ursb.go.ug/tax-returns',
        compliance: 'https://ursb.go.ug/compliance',
      },
      taxReturnTemplates: {
        vat: 'URA_VAT_RETURN_V1',
        wht: 'URA_WHT_RETURN_V1',
        paye: 'URA_PAYE_RETURN_V1',
        cit: 'URA_CIT_RETURN_V1',
      },
      digitalFiscalization: {
        eInvoicing: true,
        qrCodes: true,
        digitalSignatures: true,
        realTimeReporting: true,
      },
      translationKeys: {},
      complianceDrivers: {
        efrisIntegration: true,
        realTimeInvoicing: true,
        qrCodeGeneration: true,
        digitalSignatures: true,
      },
      fiscalCalendar: {
        taxYearStart: '07-01', // July 1st (Uganda tax year)
        taxPeriods: ['monthly', 'quarterly', 'annually'],
        filingDeadlines: {
          vat: '15th of following month',
          wht: '15th of following month',
          paye: '15th of following month',
          cit: '31st March following year end',
        },
      },
      regulatoryBodies: [
        {
          name: 'Uganda Revenue Authority (URA)',
          contact: '+256 414 301 000',
          website: 'https://ursb.go.ug',
          requirements: [
            'EFRIS e-Invoicing mandatory',
            'Digital signatures required',
            'QR codes on all invoices',
            'Real-time tax reporting',
          ],
        },
      ],
    };
  }

  async getTaxAuthorityEndpoints() {
    return {
      baseUrl: 'https://efris.ursb.go.ug',
      endpoints: {
        authenticate: '/api/v1/authenticate',
        submitInvoice: '/api/v1/invoices',
        queryInvoice: '/api/v1/invoices/query',
        submitStock: '/api/v1/stock',
        submitTaxReturn: '/api/v1/returns',
        getTaxpayerInfo: '/api/v1/taxpayer',
      },
      authentication: {
        type: 'bearer_token',
        credentials: ['username', 'password', 'private_key'],
      },
    };
  }

  async getTaxReturnTemplates() {
    return {
      templates: {
        vat: {
          formNumber: 'VAT 101',
          fields: [
            'taxpayerName',
            'taxpayerTin',
            'taxPeriod',
            'totalSales',
            'taxableSales',
            'vatCollected',
            'totalPurchases',
            'taxablePurchases',
            'inputVat',
            'vatPayable',
          ],
          validationRules: {
            totalSales: { required: true, min: 0 },
            vatCollected: { required: true, min: 0 },
            inputVat: { required: true, min: 0 },
          },
        },
        wht: {
          formNumber: 'WHT 102',
          fields: [
            'taxpayerName',
            'taxpayerTin',
            'taxPeriod',
            'paymentsMade',
            'whtDeducted',
            'whtRemitted',
          ],
          validationRules: {
            paymentsMade: { required: true, min: 0 },
            whtDeducted: { required: true, min: 0 },
          },
        },
      },
      validationRules: {
        tin: { pattern: '^[A-Z0-9]{10}$', required: true },
        amount: { min: 0, max: 999999999.99 },
        date: { format: 'YYYY-MM-DD' },
      },
      filingRequirements: {
        vat: {
          frequency: 'monthly',
          deadline: '15th of following month',
          electronic: true,
        },
        wht: {
          frequency: 'monthly',
          deadline: '15th of following month',
          electronic: true,
        },
      },
    };
  }

  async getDigitalFiscalizationConfig() {
    return {
      eInvoicing: {
        required: true,
        format: 'EFRIS_JSON',
        provider: 'URA_EFRIS',
        metadata: {
          version: '1.0',
          requiresRealTime: true,
          qrCodeRequired: true,
          digitalSignatureRequired: true,
        },
      },
      qrCodes: {
        required: true,
        format: 'EFRIS_QR',
        data: [
          'invoiceNumber',
          'date',
          'amount',
          'taxAmount',
          'buyerTin',
          'sellerTin',
          'verificationUrl',
        ],
      },
      digitalSignatures: {
        required: true,
        provider: 'URA_CERTIFICATE',
        certificate: 'Class 3 Digital Signature Certificate',
      },
    };
  }

  async getTranslationKeys(language: string): Promise<Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'tax.vat': 'Value Added Tax (VAT)',
        'tax.wht': 'Withholding Tax (WHT)',
        'tax.paye': 'Pay As You Earn (PAYE)',
        'tax.cit': 'Corporate Income Tax (CIT)',
        'invoice.number': 'Invoice Number',
        'invoice.date': 'Invoice Date',
        'invoice.amount': 'Amount (UGX)',
        'invoice.tax': 'Tax Amount',
        'invoice.total': 'Total Amount',
        'ura.tin': 'URA TIN',
        'efris.fdn': 'EFRIS FDN',
        'efris.qr': 'EFRIS QR Code',
        'compliance.status': 'Compliance Status',
      },
      // Add other languages as needed
    };

    return translations[language] || translations.en;
  }

  async validateConfiguration(config: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate URA TIN format
    if (config.uraTin && !/^[A-Z0-9]{10}$/.test(config.uraTin)) {
      errors.push('Invalid URA TIN format. Must be 10 alphanumeric characters.');
    }

    // Validate EFRIS configuration
    if (config.efrisEnabled) {
      if (!config.efrisUsername) {
        errors.push('EFRIS username is required when EFRIS is enabled.');
      }
      if (!config.efrisPassword) {
        errors.push('EFRIS password is required when EFRIS is enabled.');
      }
      if (!config.privateKeyPath) {
        warnings.push('Private key path not configured. Digital signatures may not work.');
      }
    }

    // Validate tax period
    if (config.taxPeriod && !['monthly', 'quarterly', 'annually'].includes(config.taxPeriod)) {
      errors.push('Invalid tax period. Must be monthly, quarterly, or annually.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // NCR-specific implementations for Uganda (UNBS compliance)
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
      regulatoryBodies: [
        {
          name: 'Uganda National Bureau of Standards (UNBS)',
          contact: '+256 414 301 000',
          website: 'https://ursb.go.ug',
          requirements: [
            'ISO 9001 Quality Management Systems compliance',
            'Product conformity assessment',
            'Mandatory standards certification for regulated products',
            'Quality control and testing requirements',
            'Non-conformance reporting for regulated industries',
          ],
        },
        {
          name: 'Directorate of Industrial Training (DIT)',
          contact: '+256 414 301 000',
          website: 'https://ursb.go.ug',
          requirements: [
            'Skills development and training standards',
            'Quality assurance in manufacturing',
            'Compliance with national training standards',
          ],
        },
      ],
      standards: [
        'US ISO 9001:2015 - Quality Management Systems',
        'US ISO 22000:2018 - Food Safety Management Systems',
        'US ISO 14001:2015 - Environmental Management Systems',
        'US ISO 45001:2018 - Occupational Health and Safety',
        'US EAS - East African Standards',
      ],
      reportingRequirements: {
        mandatory: true,
        frequency: 'immediate',
        format: 'electronic',
        authorities: ['UNBS', 'URA'],
      },
      complianceFields: [
        'unbsRegistrationNumber',
        'productCertificationStatus',
        'batchTestingResults',
        'qualityControlRecords',
        'regulatoryApprovalStatus',
      ],
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
      requiredFields: [
        'title',
        'description',
        'source',
        'severity',
        'status',
        'detectedDate',
        'detectedById',
        'productId',
        'lotNumber',
        'quantity',
      ],
      customFields: [
        {
          name: 'unbsRegistrationNumber',
          type: 'string',
          required: true,
          validation: { pattern: '^UNBS/[A-Z]{2}/\\d{4}/\\d{6}$' },
        },
        {
          name: 'productCertificationStatus',
          type: 'enum',
          required: true,
          validation: { values: ['CERTIFIED', 'PENDING', 'EXPIRED', 'NOT_REQUIRED'] },
        },
        {
          name: 'batchTestingResults',
          type: 'json',
          required: false,
        },
        {
          name: 'regulatoryApprovalStatus',
          type: 'enum',
          required: true,
          validation: { values: ['APPROVED', 'PENDING', 'REJECTED', 'NOT_APPLICABLE'] },
        },
        {
          name: 'escalationRequired',
          type: 'boolean',
          required: false,
        },
      ],
      workflowStates: [
        'OPEN',
        'UNDER_INVESTIGATION',
        'CONTAINED',
        'CORRECTIVE_ACTION_PLANNED',
        'CORRECTIVE_ACTION_IMPLEMENTED',
        'PREVENTIVE_ACTION_PLANNED',
        'PREVENTIVE_ACTION_IMPLEMENTED',
        'VERIFICATION_COMPLETE',
        'CLOSED',
      ],
      escalationRules: [
        {
          condition: 'severity === "CRITICAL"',
          action: 'escalate_to_management',
          notify: ['quality_manager', 'regulatory_compliance_officer'],
        },
        {
          condition: 'severity === "HIGH" && !resolved_within_24h',
          action: 'escalate_to_supervisor',
          notify: ['department_supervisor', 'quality_team'],
        },
        {
          condition: 'involves_regulated_product',
          action: 'notify_regulatory_authority',
          notify: ['unbs_compliance_officer'],
        },
      ],
    };
  }

  async getNCRTranslationKeys(language: string): Promise<Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {
      en: {
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
        'ncr.unbsRegistrationNumber': 'UNBS Registration Number',
        'ncr.productCertificationStatus': 'Product Certification Status',
        'ncr.batchTestingResults': 'Batch Testing Results',
        'ncr.regulatoryApprovalStatus': 'Regulatory Approval Status',
        'ncr.escalationRequired': 'Escalation Required',
        'ncr.regulatoryCompliance': 'Regulatory Compliance',
        'ncr.qualityStandards': 'Quality Standards',
        'ncr.unbsCompliance': 'UNBS Compliance',
      },
      // Add other languages as needed
    };

    return translations[language] || translations.en;
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

    // Uganda-specific validations
    if (!ncrData.productId) {
      errors.push('Product identification is required for UNBS compliance');
    }

    if (!ncrData.lotNumber) {
      warnings.push('Lot number should be specified for traceability');
    }

    if (!ncrData.quantity) {
      warnings.push('Affected quantity should be specified');
    }

    // UNBS registration validation
    if (ncrData.unbsRegistrationNumber) {
      const unbsPattern = /^UNBS\/[A-Z]{2}\/\d{4}\/\d{6}$/;
      if (!unbsPattern.test(ncrData.unbsRegistrationNumber)) {
        errors.push('UNBS registration number format is invalid. Expected format: UNBS/XX/YYYY/NNNNNN');
      }
    } else {
      warnings.push('UNBS registration number is recommended for regulated products');
    }

    // Certification status validation
    const validCertStatuses = ['CERTIFIED', 'PENDING', 'EXPIRED', 'NOT_REQUIRED'];
    if (ncrData.productCertificationStatus && !validCertStatuses.includes(ncrData.productCertificationStatus)) {
      errors.push('Invalid product certification status');
    }

    // Regulatory approval validation
    const validApprovalStatuses = ['APPROVED', 'PENDING', 'REJECTED', 'NOT_APPLICABLE'];
    if (ncrData.regulatoryApprovalStatus && !validApprovalStatuses.includes(ncrData.regulatoryApprovalStatus)) {
      errors.push('Invalid regulatory approval status');
    }

    // Severity-based recommendations
    if (ncrData.severity === 'CRITICAL') {
      recommendations.push('Immediate containment action required');
      recommendations.push('Notify UNBS within 24 hours for regulated products');
      recommendations.push('Escalate to senior management');
    } else if (ncrData.severity === 'HIGH') {
      recommendations.push('Containment action required within 48 hours');
      recommendations.push('Notify department supervisor');
    }

    // Regulatory compliance recommendations
    if (ncrData.productCertificationStatus === 'EXPIRED') {
      recommendations.push('Product certification has expired - immediate action required');
    }

    if (ncrData.regulatoryApprovalStatus === 'REJECTED') {
      recommendations.push('Product was rejected by regulatory authority - investigate root cause');
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  // CAPA-specific implementations for Uganda (UNBS compliance)
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
      regulatoryBodies: [
        {
          name: 'Uganda National Bureau of Standards (UNBS)',
          contact: '+256 414 301 000',
          website: 'https://ursb.go.ug',
          requirements: [
            'ISO 9001 Quality Management Systems compliance',
            'Mandatory CAPA for critical non-conformances',
            'Root cause analysis requirements',
            'Effectiveness verification mandatory',
            'Regulatory reporting for safety-related issues',
          ],
        },
        {
          name: 'Directorate of Industrial Training (DIT)',
          contact: '+256 414 301 000',
          website: 'https://ursb.go.ug',
          requirements: [
            'Skills gap analysis and training CAPAs',
            'Quality assurance system improvements',
            'Compliance with national training standards',
          ],
        },
      ],
      standards: [
        'US ISO 9001:2015 - Quality Management Systems',
        'US ISO 22000:2018 - Food Safety Management Systems',
        'US ISO 14001:2015 - Environmental Management Systems',
        'US ISO 45001:2018 - Occupational Health and Safety',
        'US EAS - East African Standards',
      ],
      reportingRequirements: {
        mandatory: true,
        frequency: 'quarterly',
        format: 'electronic',
        authorities: ['UNBS', 'URA'],
      },
      complianceFields: [
        'unbsRegistrationNumber',
        'productCertificationStatus',
        'regulatoryApprovalStatus',
        'batchTestingResults',
        'qualityControlRecords',
        'effectivenessVerificationDate',
      ],
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
      requiredFields: [
        'title',
        'description',
        'source',
        'riskLevel',
        'investigationMethod',
        'status',
        'createdDate',
        'createdById',
        'rootCauseAnalysis',
        'correctiveAction',
        'preventiveAction',
        'effectivenessVerification',
      ],
      customFields: [
        {
          name: 'unbsRegistrationNumber',
          type: 'string',
          required: true,
          validation: { pattern: '^UNBS/[0-9]{4}/[0-9]+$' },
        },
        {
          name: 'productCertificationStatus',
          type: 'enum',
          required: true,
          validation: { values: ['CERTIFIED', 'PENDING', 'REJECTED', 'EXPIRED'] },
        },
        {
          name: 'regulatoryApprovalStatus',
          type: 'enum',
          required: false,
          validation: { values: ['APPROVED', 'PENDING', 'REJECTED', 'UNDER_REVIEW'] },
        },
        {
          name: 'batchTestingResults',
          type: 'json',
          required: false,
        },
        {
          name: 'qualityControlRecords',
          type: 'json',
          required: false,
        },
      ],
      workflowStates: [
        'OPEN',
        'UNDER_INVESTIGATION',
        'ROOT_CAUSE_IDENTIFIED',
        'ACTIONS_PLANNED',
        'ACTIONS_IMPLEMENTED',
        'VERIFICATION_PENDING',
        'VERIFICATION_COMPLETE',
        'CLOSED',
      ],
      escalationRules: [
        {
          condition: 'riskLevel === "CRITICAL"',
          action: 'escalate_to_senior_management',
          notify: ['quality_manager', 'senior_management', 'regulatory_affairs'],
        },
        {
          condition: 'source === "REGULATORY_NON_COMPLIANCE"',
          action: 'notify_regulatory_authorities',
          notify: ['regulatory_affairs', 'legal_department'],
        },
        {
          condition: 'status === "VERIFICATION_PENDING" && daysOpen > 30',
          action: 'escalate_overdue_verification',
          notify: ['quality_manager', 'department_head'],
        },
      ],
    };
  }

  async getCAPATranslationKeys(language: string): Promise<Record<string, string>> {
    if (language === 'sw') {
      // Swahili translations
      return {
        'capa.title': 'Hatua ya Kurekebisha na Kuzuia',
        'capa.number': 'Nambari ya CAPA',
        'capa.description': 'Maelezo',
        'capa.riskLevel': 'Kiwango cha Hatari',
        'capa.status': 'Hali',
        'capa.source': 'Chanzo',
        'capa.rootCause': 'Uchambuzi wa Chanzo cha Msingi',
        'capa.correctiveAction': 'Hatua ya Kurekebisha',
        'capa.preventiveAction': 'Hatua ya Kuzuia',
        'capa.effectivenessVerification': 'Uthibitisho wa Ufanisi',
        'capa.unbsRegistrationNumber': 'Nambari ya Usajili UNBS',
        'capa.productCertificationStatus': 'Hali ya Cheti cha Bidhaa',
        'capa.regulatoryApprovalStatus': 'Hali ya Idhini ya Udhibiti',
      };
    }

    // English translations
    return {
      'capa.title': 'Corrective and Preventive Action',
      'capa.number': 'CAPA Number',
      'capa.description': 'Description',
      'capa.riskLevel': 'Risk Level',
      'capa.status': 'Status',
      'capa.riskLevel.LOW': 'Low Risk',
      'capa.riskLevel.MEDIUM': 'Medium Risk',
      'capa.riskLevel.HIGH': 'High Risk',
      'capa.riskLevel.CRITICAL': 'Critical Risk',
      'capa.status.OPEN': 'Open',
      'capa.status.UNDER_INVESTIGATION': 'Under Investigation',
      'capa.status.ROOT_CAUSE_IDENTIFIED': 'Root Cause Identified',
      'capa.status.ACTIONS_PLANNED': 'Actions Planned',
      'capa.status.ACTIONS_IMPLEMENTED': 'Actions Implemented',
      'capa.status.VERIFICATION_PENDING': 'Verification Pending',
      'capa.status.VERIFICATION_COMPLETE': 'Verification Complete',
      'capa.status.CLOSED': 'Closed',
      'capa.source': 'Source',
      'capa.rootCause': 'Root Cause Analysis',
      'capa.correctiveAction': 'Corrective Action',
      'capa.preventiveAction': 'Preventive Action',
      'capa.effectivenessVerification': 'Effectiveness Verification',
      'capa.unbsRegistrationNumber': 'UNBS Registration Number',
      'capa.productCertificationStatus': 'Product Certification Status',
      'capa.regulatoryApprovalStatus': 'Regulatory Approval Status',
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
    if (!capaData.investigationMethod) errors.push('Investigation method is required');

    // Uganda-specific validations
    if (capaData.source === 'REGULATORY_NON_COMPLIANCE') {
      if (!capaData.localData?.unbsRegistrationNumber) {
        errors.push('UNBS registration number is required for regulatory non-compliance');
      }
      if (!capaData.localData?.regulatoryApprovalStatus) {
        warnings.push('Regulatory approval status should be documented');
      }
    }

    if (capaData.riskLevel === 'CRITICAL') {
      if (!capaData.correctiveAction) {
        errors.push('Corrective action is mandatory for critical risk CAPAs');
      }
      if (!capaData.preventiveAction) {
        errors.push('Preventive action is mandatory for critical risk CAPAs');
      }
      recommendations.push('Critical risk CAPA requires senior management review');
    }

    if (capaData.status === 'VERIFICATION_PENDING' && !capaData.effectivenessVerification) {
      warnings.push('Effectiveness verification plan should be documented before verification');
    }

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
          LOW: {
            min: 1,
            max: 6,
            actions: ['Monitor', 'Document', 'Inform quality team']
          },
          MEDIUM: {
            min: 7,
            max: 12,
            actions: ['Plan mitigation', 'Assign responsibility', 'Quarterly review']
          },
          HIGH: {
            min: 13,
            max: 20,
            actions: ['Immediate action required', 'Senior management review', 'Regulatory notification if applicable']
          },
          CRITICAL: {
            min: 21,
            max: 25,
            actions: ['Emergency response', 'Board-level notification', 'Immediate regulatory reporting', 'Product recall consideration']
          },
        },
      },
      assessmentCriteria: {
        financial: [
          'Cost impact > UGX 10M',
          'Revenue loss > UGX 50M',
          'Budget variance > 15%',
          'Insurance claim potential'
        ],
        operational: [
          'Process disruption > 24 hours',
          'Resource utilization > 80% capacity',
          'Timeline delay > 30 days',
          'Multiple department impact'
        ],
        compliance: [
          'Regulatory violation',
          'Contract breach',
          'Standard non-compliance',
          'Legal liability potential'
        ],
        reputational: [
          'Customer satisfaction < 80%',
          'Brand damage potential',
          'Stakeholder trust impact',
          'Media attention potential'
        ],
      },
      requiredEvidenceCodes: [
        'DOC - Documentary Evidence',
        'REC - Records Review',
        'OBS - Observation',
        'INT - Interview',
        'ANA - Data Analysis',
        'TST - Testing Results',
        'AUD - Audit Findings'
      ],
    };
  }
}