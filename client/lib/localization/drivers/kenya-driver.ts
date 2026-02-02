/**
 * Kenya Localization Driver
 * Implements Kenya-specific localization requirements for KRA compliance
 */

import { BaseLocalizationStrategy, LocalizationMetadata } from '../localization-provider';

export class KenyaLocalizationStrategy extends BaseLocalizationStrategy {
  countryCode = 'KE';

  async getLocalizationMetadata(): Promise<LocalizationMetadata> {
    return {
      apiEndpoints: {
        taxAuthority: 'https://itax.kra.go.ke',
        eInvoicing: 'https://einvoice.kra.go.ke',
        taxReturns: 'https://itax.kra.go.ke/returns',
        compliance: 'https://kra.go.ke/compliance',
      },
      taxReturnTemplates: {
        vat: 'KRA_VAT_RETURN_V1',
        wht: 'KRA_WHT_RETURN_V1',
        paye: 'KRA_PAYE_RETURN_V1',
        cit: 'KRA_CIT_RETURN_V1',
      },
      digitalFiscalization: {
        eInvoicing: true,
        qrCodes: false,
        digitalSignatures: false,
        realTimeReporting: false,
      },
      translationKeys: {},
      complianceDrivers: {
        iTaxIntegration: true,
        electronicFiling: true,
        realTimeInvoicing: false,
      },
      fiscalCalendar: {
        taxYearStart: '01-01', // January 1st (Kenya tax year)
        taxPeriods: ['monthly', 'quarterly', 'annually'],
        filingDeadlines: {
          vat: '20th of following month',
          wht: '20th of following month',
          paye: '9th of following month',
          cit: '31st March following year end',
        },
      },
      regulatoryBodies: [
        {
          name: 'Kenya Revenue Authority (KRA)',
          contact: '+254 20 2729000',
          website: 'https://kra.go.ke',
          requirements: [
            'iTax electronic filing mandatory',
            'E-invoicing planned for implementation',
            'Digital tax compliance',
          ],
        },
      ],
    };
  }

  async getTaxAuthorityEndpoints() {
    return {
      baseUrl: 'https://itax.kra.go.ke',
      endpoints: {
        authenticate: '/api/authenticate',
        submitReturn: '/api/returns',
        queryReturn: '/api/returns/query',
        getTaxpayerInfo: '/api/taxpayer',
        submitPayment: '/api/payments',
      },
      authentication: {
        type: 'certificate',
        credentials: ['pin', 'certificate_path'],
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
            'kraPin',
            'taxPeriod',
            'totalSales',
            'vatableSales',
            'vatCollected',
            'totalPurchases',
            'vatablePurchases',
            'inputVat',
            'vatPayable',
          ],
          validationRules: {
            totalSales: { required: true, min: 0 },
            vatCollected: { required: true, min: 0 },
          },
        },
        paye: {
          formNumber: 'P9',
          fields: [
            'employeeName',
            'kraPin',
            'basicSalary',
            'benefits',
            'grossPay',
            'deductions',
            'taxablePay',
            'payeDeducted',
          ],
          validationRules: {
            basicSalary: { required: true, min: 0 },
            payeDeducted: { required: true, min: 0 },
          },
        },
      },
      validationRules: {
        kraPin: { pattern: '^[A-Z0-9]{11}$', required: true },
        amount: { min: 0, max: 999999999.99 },
        date: { format: 'YYYY-MM-DD' },
      },
      filingRequirements: {
        vat: {
          frequency: 'monthly',
          deadline: '20th of following month',
          electronic: true,
        },
        paye: {
          frequency: 'monthly',
          deadline: '9th of following month',
          electronic: true,
        },
      },
    };
  }

  async getDigitalFiscalizationConfig() {
    return {
      eInvoicing: {
        required: false, // Planned but not yet mandatory
        format: 'KRA_EINVOICE',
        provider: 'KRA_iTAX',
        metadata: {
          version: '1.0',
          plannedImplementation: '2024',
          currentlyOptional: true,
        },
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
    const translations: Record<string, Record<string, string>> = {
      en: {
        'tax.vat': 'Value Added Tax (VAT)',
        'tax.wht': 'Withholding Tax (WHT)',
        'tax.paye': 'Pay As You Earn (PAYE)',
        'tax.cit': 'Corporate Income Tax (CIT)',
        'invoice.number': 'Invoice Number',
        'invoice.date': 'Invoice Date',
        'invoice.amount': 'Amount (KES)',
        'invoice.tax': 'Tax Amount',
        'invoice.total': 'Total Amount',
        'kra.pin': 'KRA PIN',
        'compliance.status': 'Compliance Status',
      },
    };

    return translations[language] || translations.en;
  }

  async validateConfiguration(config: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate KRA PIN format
    if (config.kraPin && !/^[A-Z0-9]{11}$/.test(config.kraPin)) {
      errors.push('Invalid KRA PIN format. Must be 11 alphanumeric characters.');
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

  // NCR-specific implementations for Kenya (KEBS compliance)
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
          name: 'Kenya Bureau of Standards (KEBS)',
          contact: '+254 20 6948000',
          website: 'https://kebs.org',
          requirements: [
            'Mandatory standards certification for regulated products',
            'Product conformity assessment and marking',
            'Quality management systems compliance',
            'Mandatory reporting for safety-related non-conformances',
            'Standards compliance verification',
          ],
        },
        {
          name: 'Anti-Counterfeit Agency (ACA)',
          contact: '+254 20 2212299',
          website: 'https://aca.go.ke',
          requirements: [
            'Anti-counterfeiting measures',
            'Product authenticity verification',
            'Quality assurance for protected products',
          ],
        },
        {
          name: 'Public Procurement Regulatory Authority (PPRA)',
          contact: '+254 20 3244000',
          website: 'https://ppra.go.ke',
          requirements: [
            'Quality standards for public procurement',
            'Supplier qualification requirements',
            'Compliance with procurement quality standards',
          ],
        },
      ],
      standards: [
        'KS ISO 9001:2015 - Quality Management Systems',
        'KS ISO 22000:2018 - Food Safety Management Systems',
        'KS ISO 14001:2015 - Environmental Management Systems',
        'KS ISO 45001:2018 - Occupational Health and Safety',
        'KS EAS - East African Standards',
        'KS - Kenya Standards',
      ],
      reportingRequirements: {
        mandatory: true,
        frequency: 'immediate',
        format: 'electronic',
        authorities: ['KEBS', 'ACA'],
      },
      complianceFields: [
        'kebsCertificationNumber',
        'productStandardMark',
        'batchTestingCompliance',
        'supplierQualificationStatus',
        'regulatoryClearanceStatus',
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
          name: 'kebsCertificationNumber',
          type: 'string',
          required: true,
          validation: { pattern: '^KEBS/[A-Z]{2}/\\d{4}/\\d{6}$' },
        },
        {
          name: 'productStandardMark',
          type: 'enum',
          required: true,
          validation: { values: ['MARKED', 'NOT_MARKED', 'EXPIRED', 'NOT_REQUIRED'] },
        },
        {
          name: 'batchTestingCompliance',
          type: 'enum',
          required: false,
          validation: { values: ['COMPLIANT', 'NON_COMPLIANT', 'PENDING_TEST', 'NOT_TESTED'] },
        },
        {
          name: 'supplierQualificationStatus',
          type: 'enum',
          required: true,
          validation: { values: ['QUALIFIED', 'DISQUALIFIED', 'UNDER_REVIEW', 'NOT_APPLICABLE'] },
        },
        {
          name: 'regulatoryClearanceStatus',
          type: 'enum',
          required: true,
          validation: { values: ['CLEARED', 'PENDING', 'REJECTED', 'NOT_REQUIRED'] },
        },
        {
          name: 'counterfeitRisk',
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
          condition: 'severity === "HIGH" && !resolved_within_48h',
          action: 'escalate_to_supervisor',
          notify: ['department_supervisor', 'quality_team'],
        },
        {
          condition: 'counterfeitRisk === true',
          action: 'notify_anti_counterfeit_agency',
          notify: ['aca_compliance_officer', 'senior_management'],
        },
        {
          condition: 'involves_regulated_product && regulatoryClearanceStatus === "REJECTED"',
          action: 'notify_kebs',
          notify: ['kebs_compliance_officer'],
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
        'ncr.kebsCertificationNumber': 'KEBS Certification Number',
        'ncr.productStandardMark': 'Product Standard Mark',
        'ncr.batchTestingCompliance': 'Batch Testing Compliance',
        'ncr.supplierQualificationStatus': 'Supplier Qualification Status',
        'ncr.regulatoryClearanceStatus': 'Regulatory Clearance Status',
        'ncr.counterfeitRisk': 'Counterfeit Risk',
        'ncr.regulatoryCompliance': 'Regulatory Compliance',
        'ncr.qualityStandards': 'Quality Standards',
        'ncr.kebsCompliance': 'KEBS Compliance',
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

    // Kenya-specific validations
    if (!ncrData.productId) {
      errors.push('Product identification is required for KEBS compliance');
    }

    if (!ncrData.lotNumber) {
      warnings.push('Lot number should be specified for traceability');
    }

    if (!ncrData.quantity) {
      warnings.push('Affected quantity should be specified');
    }

    // KEBS certification validation
    if (ncrData.kebsCertificationNumber) {
      const kebsPattern = /^KEBS\/[A-Z]{2}\/\d{4}\/\d{6}$/;
      if (!kebsPattern.test(ncrData.kebsCertificationNumber)) {
        errors.push('KEBS certification number format is invalid. Expected format: KEBS/XX/YYYY/NNNNNN');
      }
    } else {
      warnings.push('KEBS certification number is recommended for regulated products');
    }

    // Product standard mark validation
    const validMarkStatuses = ['MARKED', 'NOT_MARKED', 'EXPIRED', 'NOT_REQUIRED'];
    if (ncrData.productStandardMark && !validMarkStatuses.includes(ncrData.productStandardMark)) {
      errors.push('Invalid product standard mark status');
    }

    // Supplier qualification validation
    const validQualificationStatuses = ['QUALIFIED', 'DISQUALIFIED', 'UNDER_REVIEW', 'NOT_APPLICABLE'];
    if (ncrData.supplierQualificationStatus && !validQualificationStatuses.includes(ncrData.supplierQualificationStatus)) {
      errors.push('Invalid supplier qualification status');
    }

    // Regulatory clearance validation
    const validClearanceStatuses = ['CLEARED', 'PENDING', 'REJECTED', 'NOT_REQUIRED'];
    if (ncrData.regulatoryClearanceStatus && !validClearanceStatuses.includes(ncrData.regulatoryClearanceStatus)) {
      errors.push('Invalid regulatory clearance status');
    }

    // Batch testing compliance validation
    const validTestingStatuses = ['COMPLIANT', 'NON_COMPLIANT', 'PENDING_TEST', 'NOT_TESTED'];
    if (ncrData.batchTestingCompliance && !validTestingStatuses.includes(ncrData.batchTestingCompliance)) {
      errors.push('Invalid batch testing compliance status');
    }

    // Severity-based recommendations
    if (ncrData.severity === 'CRITICAL') {
      recommendations.push('Immediate containment action required');
      recommendations.push('Notify KEBS within 24 hours for regulated products');
      recommendations.push('Escalate to senior management');
    } else if (ncrData.severity === 'HIGH') {
      recommendations.push('Containment action required within 48 hours');
      recommendations.push('Notify department supervisor');
    }

    // Regulatory compliance recommendations
    if (ncrData.productStandardMark === 'EXPIRED') {
      recommendations.push('Product standard mark has expired - immediate action required');
    }

    if (ncrData.regulatoryClearanceStatus === 'REJECTED') {
      recommendations.push('Product was rejected by regulatory authority - investigate root cause');
    }

    if (ncrData.supplierQualificationStatus === 'DISQUALIFIED') {
      recommendations.push('Supplier is disqualified - review supplier selection process');
    }

    if (ncrData.counterfeitRisk === true) {
      recommendations.push('Counterfeit risk identified - notify Anti-Counterfeit Agency');
      recommendations.push('Implement additional verification measures');
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }
}