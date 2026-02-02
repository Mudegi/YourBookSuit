/**
 * Localization Dummy Data
 * Sample data for testing the localization system
 */

export const localizationDummyData = {
  uganda: {
    country: 'UG',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '1,234.56',
    currencyFormat: 'UGX 1,234.56',
    firstDayOfWeek: 1, // Monday
    fiscalYearStart: 7, // July
    taxIdLabel: 'URA TIN',
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
    translationKeys: {
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
    complianceDrivers: {
      efrisIntegration: true,
      realTimeInvoicing: true,
      qrCodeGeneration: true,
      digitalSignatures: true,
    },
    fiscalCalendar: {
      taxYearStart: '07-01',
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
  },

  kenya: {
    country: 'KE',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: '1,234.56',
    currencyFormat: 'KES 1,234.56',
    firstDayOfWeek: 1, // Monday
    fiscalYearStart: 1, // January
    taxIdLabel: 'KRA PIN',
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
      eInvoicing: false, // Planned but not yet mandatory
      qrCodes: false,
      digitalSignatures: false,
      realTimeReporting: false,
    },
    translationKeys: {
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
    complianceDrivers: {
      iTaxIntegration: true,
      electronicFiling: true,
      realTimeInvoicing: false,
    },
    fiscalCalendar: {
      taxYearStart: '01-01',
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
  },
};