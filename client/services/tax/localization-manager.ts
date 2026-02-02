/**
 * Localization Manager for Tax Returns
 * Provides country-specific tax return templates and validation rules
 * NO HARDCODING - All tax forms are driven by localization data
 */

export interface TaxReturnTemplate {
  countryCode: string;
  countryName: string;
  taxAuthority: string;
  formName: string;
  formVersion: string;
  
  boxes: TaxReturnBox[];
  
  // Validation rules
  validation: {
    allowNegativeVAT: boolean;
    requireEFRIS: boolean;
    minimumComplianceRate: number; // percentage
    requiredDocuments: string[];
  };
  
  // Filing details
  filing: {
    frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
    dueDate: string; // e.g., "15th of following month"
    latePenalty: string;
    exportFormat: 'CSV' | 'XML' | 'JSON' | 'EXCEL';
  };
}

export interface TaxReturnBox {
  boxNumber: string;
  label: string;
  description: string;
  type: 'REVENUE' | 'TAX' | 'CALCULATED';
  category: 'OUTPUT_VAT' | 'INPUT_VAT' | 'ZERO_RATED' | 'EXEMPT' | 'NET';
  
  // Mapping to internal data
  sourceMapping: {
    taxRates?: number[]; // e.g., [18] for standard rate
    accountTypes?: string[];
    transactionTypes?: string[];
  };
  
  // Display formatting
  format: 'CURRENCY' | 'PERCENTAGE' | 'NUMBER';
  editable: boolean;
  required: boolean;
}

export class LocalizationManager {
  /**
   * Get tax return template for a specific country
   */
  static getTaxReturnTemplate(countryCode: string): TaxReturnTemplate {
    const templates: Record<string, TaxReturnTemplate> = {
      UG: this.getUgandaVATReturnTemplate(),
      KE: this.getKenyaVATReturnTemplate(),
      TZ: this.getTanzaniaVATReturnTemplate(),
      // Add more countries as needed
    };

    const template = templates[countryCode];
    if (!template) {
      throw new Error(`Tax return template not available for country: ${countryCode}`);
    }

    return template;
  }

  /**
   * Uganda VAT Return Template (URA)
   */
  private static getUgandaVATReturnTemplate(): TaxReturnTemplate {
    return {
      countryCode: 'UG',
      countryName: 'Uganda',
      taxAuthority: 'Uganda Revenue Authority (URA)',
      formName: 'VAT Return Form',
      formVersion: '2024',
      
      boxes: [
        {
          boxNumber: '1',
          label: 'Standard Rated Sales (18%)',
          description: 'Total sales subject to 18% VAT',
          type: 'REVENUE',
          category: 'OUTPUT_VAT',
          sourceMapping: {
            taxRates: [18],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '1A',
          label: 'Output VAT on Standard Rated Sales',
          description: 'VAT collected on standard rated sales',
          type: 'TAX',
          category: 'OUTPUT_VAT',
          sourceMapping: {
            taxRates: [18],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '2',
          label: 'Zero-Rated Sales (Exports)',
          description: 'Sales at 0% VAT (exports and international services)',
          type: 'REVENUE',
          category: 'ZERO_RATED',
          sourceMapping: {
            taxRates: [0],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '3',
          label: 'Exempt Sales',
          description: 'Sales exempt from VAT (education, healthcare, etc.)',
          type: 'REVENUE',
          category: 'EXEMPT',
          sourceMapping: {
            taxRates: [],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '4',
          label: 'Total Sales (Box 1 + Box 2 + Box 3)',
          description: 'Sum of all sales',
          type: 'CALCULATED',
          category: 'OUTPUT_VAT',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '5',
          label: 'Input Tax on Purchases',
          description: 'VAT paid on business purchases and expenses',
          type: 'TAX',
          category: 'INPUT_VAT',
          sourceMapping: {
            transactionTypes: ['PURCHASE_INVOICE', 'EXPENSE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '6',
          label: 'Import VAT',
          description: 'VAT paid on imported goods (can be claimed as input tax)',
          type: 'TAX',
          category: 'INPUT_VAT',
          sourceMapping: {
            transactionTypes: ['IMPORT'],
          },
          format: 'CURRENCY',
          editable: true,
          required: false,
        },
        {
          boxNumber: '7',
          label: 'Total Input Tax (Box 5 + Box 6)',
          description: 'Total VAT that can be claimed',
          type: 'CALCULATED',
          category: 'INPUT_VAT',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '8',
          label: 'Net VAT Payable/Refundable',
          description: 'Output VAT (Box 1A) minus Total Input Tax (Box 7)',
          type: 'CALCULATED',
          category: 'NET',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '9',
          label: 'VAT Refund Carried Forward',
          description: 'Refund from previous period',
          type: 'TAX',
          category: 'NET',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: true,
          required: false,
        },
        {
          boxNumber: '10',
          label: 'Net VAT Due',
          description: 'Final amount to pay after adjustments',
          type: 'CALCULATED',
          category: 'NET',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
      ],
      
      validation: {
        allowNegativeVAT: true, // Uganda allows VAT refunds
        requireEFRIS: true, // EFRIS integration is mandatory
        minimumComplianceRate: 95, // 95% of transactions must be fiscalized
        requiredDocuments: [
          'Sales Register',
          'Purchases Register',
          'EFRIS Fiscal Device Reports',
          'Bank Statements',
        ],
      },
      
      filing: {
        frequency: 'MONTHLY',
        dueDate: '15th of following month',
        latePenalty: '2% per month on unpaid tax',
        exportFormat: 'EXCEL',
      },
    };
  }

  /**
   * Kenya VAT Return Template (KRA)
   */
  private static getKenyaVATReturnTemplate(): TaxReturnTemplate {
    return {
      countryCode: 'KE',
      countryName: 'Kenya',
      taxAuthority: 'Kenya Revenue Authority (KRA)',
      formName: 'VAT 3 Return',
      formVersion: '2024',
      
      boxes: [
        {
          boxNumber: '5A',
          label: 'Standard Rated Sales (16%)',
          description: 'Sales subject to 16% VAT',
          type: 'REVENUE',
          category: 'OUTPUT_VAT',
          sourceMapping: {
            taxRates: [16],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '5B',
          label: 'Output Tax on Standard Sales',
          description: 'VAT charged on standard rated sales',
          type: 'TAX',
          category: 'OUTPUT_VAT',
          sourceMapping: {
            taxRates: [16],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '6A',
          label: 'Zero Rated Sales',
          description: 'Exports and zero-rated supplies',
          type: 'REVENUE',
          category: 'ZERO_RATED',
          sourceMapping: {
            taxRates: [0],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '7',
          label: 'Exempt Sales',
          description: 'VAT exempt supplies',
          type: 'REVENUE',
          category: 'EXEMPT',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '11',
          label: 'Input Tax Claimed',
          description: 'Total input VAT on purchases',
          type: 'TAX',
          category: 'INPUT_VAT',
          sourceMapping: {
            transactionTypes: ['PURCHASE_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '15',
          label: 'Net VAT Payable/Refundable',
          description: 'Output tax minus input tax',
          type: 'CALCULATED',
          category: 'NET',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
      ],
      
      validation: {
        allowNegativeVAT: true,
        requireEFRIS: false, // Kenya uses different system (eTIMS)
        minimumComplianceRate: 90,
        requiredDocuments: [
          'Sales Book',
          'Purchases Book',
          'eTIMS Reports',
        ],
      },
      
      filing: {
        frequency: 'MONTHLY',
        dueDate: '20th of following month',
        latePenalty: '5% of unpaid tax or KES 10,000, whichever is higher',
        exportFormat: 'XML',
      },
    };
  }

  /**
   * Tanzania VAT Return Template (TRA)
   */
  private static getTanzaniaVATReturnTemplate(): TaxReturnTemplate {
    return {
      countryCode: 'TZ',
      countryName: 'Tanzania',
      taxAuthority: 'Tanzania Revenue Authority (TRA)',
      formName: 'VAT Return',
      formVersion: '2024',
      
      boxes: [
        {
          boxNumber: '1',
          label: 'Standard Rated Sales (18%)',
          description: 'Sales at standard rate',
          type: 'REVENUE',
          category: 'OUTPUT_VAT',
          sourceMapping: {
            taxRates: [18],
            transactionTypes: ['SALES_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '2',
          label: 'Output VAT',
          description: 'VAT on standard sales',
          type: 'TAX',
          category: 'OUTPUT_VAT',
          sourceMapping: {
            taxRates: [18],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '3',
          label: 'Zero Rated Sales',
          description: 'Exports and zero-rated supplies',
          type: 'REVENUE',
          category: 'ZERO_RATED',
          sourceMapping: {
            taxRates: [0],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '5',
          label: 'Input Tax',
          description: 'VAT on purchases',
          type: 'TAX',
          category: 'INPUT_VAT',
          sourceMapping: {
            transactionTypes: ['PURCHASE_INVOICE'],
          },
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
        {
          boxNumber: '6',
          label: 'Net VAT',
          description: 'Output VAT minus Input VAT',
          type: 'CALCULATED',
          category: 'NET',
          sourceMapping: {},
          format: 'CURRENCY',
          editable: false,
          required: true,
        },
      ],
      
      validation: {
        allowNegativeVAT: true,
        requireEFRIS: false,
        minimumComplianceRate: 85,
        requiredDocuments: [
          'Sales Register',
          'Purchase Register',
          'VFD Reports',
        ],
      },
      
      filing: {
        frequency: 'MONTHLY',
        dueDate: '20th of following month',
        latePenalty: 'TZS 200,000 or 2% per month',
        exportFormat: 'EXCEL',
      },
    };
  }

  /**
   * Validate tax return data against country-specific rules
   */
  static validateTaxReturn(
    countryCode: string,
    taxReturn: any
  ): { isValid: boolean; errors: string[] } {
    const template = this.getTaxReturnTemplate(countryCode);
    const errors: string[] = [];

    // Check EFRIS compliance if required
    if (template.validation.requireEFRIS) {
      if (taxReturn.efrisCompliance.complianceRate < template.validation.minimumComplianceRate) {
        errors.push(
          `EFRIS compliance rate (${taxReturn.efrisCompliance.complianceRate.toFixed(1)}%) ` +
          `is below minimum required (${template.validation.minimumComplianceRate}%)`
        );
      }
    }

    // Check negative VAT if not allowed
    if (!template.validation.allowNegativeVAT && taxReturn.boxes.box4_netTaxPayable.isNegative()) {
      errors.push('Negative VAT is not allowed in this jurisdiction');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export tax return in country-specific format
   */
  static async exportTaxReturn(
    countryCode: string,
    taxReturn: any,
    format?: string
  ): Promise<{content: string; filename: string; mimeType: string}> {
    const template = this.getTaxReturnTemplate(countryCode);
    const exportFormat = format || template.filing.exportFormat;

    switch (exportFormat) {
      case 'CSV':
        return this.exportToCSV(taxReturn, template);
      case 'EXCEL':
        return this.exportToExcel(taxReturn, template);
      case 'XML':
        return this.exportToXML(taxReturn, template);
      case 'JSON':
        return this.exportToJSON(taxReturn, template);
      default:
        throw new Error(`Unsupported export format: ${exportFormat}`);
    }
  }

  private static exportToCSV(taxReturn: any, template: TaxReturnTemplate): any {
    // Implementation for CSV export
    const rows = [
      ['Box', 'Description', 'Amount'],
      ...template.boxes.map(box => [
        box.boxNumber,
        box.label,
        '', // Value would be populated from taxReturn
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');

    return {
      content: csv,
      filename: `VAT_Return_${template.countryCode}_${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    };
  }

  private static exportToExcel(taxReturn: any, template: TaxReturnTemplate): any {
    // TODO: Implement Excel export using a library like exceljs
    return {
      content: '',
      filename: `VAT_Return_${template.countryCode}_${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private static exportToXML(taxReturn: any, template: TaxReturnTemplate): any {
    // TODO: Implement XML export
    return {
      content: '<?xml version="1.0"?><VATReturn></VATReturn>',
      filename: `VAT_Return_${template.countryCode}_${new Date().toISOString().split('T')[0]}.xml`,
      mimeType: 'application/xml',
    };
  }

  private static exportToJSON(taxReturn: any, template: TaxReturnTemplate): any {
    return {
      content: JSON.stringify(taxReturn, null, 2),
      filename: `VAT_Return_${template.countryCode}_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json',
    };
  }
}

export default LocalizationManager;
