/**
 * EFRIS Tax Category Mapping Utility
 * Maps YourBookSuit tax rates to Uganda EFRIS T109 tax classification codes
 */

export interface TaxRateForMapping {
  id: string;
  taxType: string;
  rate: number;
  efrisTaxCategoryCode?: string | null;
  efrisGoodsCategoryId?: string | null;
}

export interface EfrisTaxClassification {
  taxCategoryCode: string;
  taxCategoryName: string;
  discountFlag: string;
  deemedFlag: string;
  exciseFlag: string;
  vatApplicableFlag: string;
  taxRate: string; // "0.18" for 18%, "-" for exempt, "0" for zero-rated
}

/**
 * Auto-detect EFRIS tax category code from tax rate
 */
export function getEfrisTaxCategoryCode(taxRate: TaxRateForMapping): string {
  // If explicitly set, use it
  if (taxRate.efrisTaxCategoryCode) {
    return taxRate.efrisTaxCategoryCode;
  }

  // Auto-detect based on tax type and rate
  switch (taxRate.taxType) {
    case 'VAT':
    case 'GST':
    case 'SALES_TAX':
      if (taxRate.rate === 0) {
        return '02'; // Zero-rated (0%)
      } else if (taxRate.rate === 18) {
        return '01'; // Standard (18%)
      } else if (taxRate.rate < 0 || isNaN(taxRate.rate)) {
        return '03'; // Exempt (-)
      } else {
        return '01'; // Default to standard
      }
    
    case 'DEEMED':
      return '04'; // Deemed (18%)
    
    case 'EXCISE':
      return '05'; // Excise Duty
    
    default:
      return '01'; // Default to standard
  }
}

/**
 * Get EFRIS tax category name from code
 */
export function getEfrisTaxCategoryName(code: string): string {
  const categoryNames: Record<string, string> = {
    '01': 'Standard',
    '02': 'Zero',
    '03': 'Exempt',
    '04': 'Deemed',
    '05': 'Excise Duty',
    '06': 'Over the Top Service (OTT)',
    '07': 'Stamp Duty',
    '08': 'Local Hotel Service Tax',
    '09': 'UCC Levy',
    '10': 'Others',
    '11': 'VAT Out of Scope',
  };
  
  return categoryNames[code] || 'Unknown';
}

/**
 * Get complete EFRIS tax classification for an invoice item
 */
export function getEfrisTaxClassification(
  taxRate: TaxRateForMapping | null,
  hasDiscount: boolean,
  exciseDutyCode?: string | null
): EfrisTaxClassification {
  if (!taxRate) {
    // No tax - treat as exempt
    return {
      taxCategoryCode: '03',
      taxCategoryName: 'Exempt',
      discountFlag: hasDiscount ? '1' : '2',
      deemedFlag: '2',
      exciseFlag: '2',
      vatApplicableFlag: '1', // VAT applies (but exempt)
      taxRate: '-',
    };
  }

  const taxCategoryCode = getEfrisTaxCategoryCode(taxRate);
  const taxCategoryName = getEfrisTaxCategoryName(taxCategoryCode);
  
  // Check if item has excise duty
  const hasExcise = !!exciseDutyCode || taxRate.taxType === 'EXCISE';
  
  // Check if deemed
  const isDemed = taxRate.taxType === 'DEEMED' || taxCategoryCode === '04';
  
  // Check if exempt
  const isExempt = taxCategoryCode === '03' || taxRate.rate < 0;
  
  // Format tax rate for EFRIS - always as string
  let efrisTaxRate: string;
  if (isExempt || isDemed) {
    efrisTaxRate = '-'; // Exempt and deemed shown as "-"
  } else if (taxRate.rate === 0) {
    efrisTaxRate = '0'; // Zero-rated
  } else {
    efrisTaxRate = (taxRate.rate / 100).toString(); // Convert 18 to "0.18"
  }
  
  // Check if VAT Out of Scope (category 11)
  const isOutOfScope = taxCategoryCode === '11';
  
  return {
    taxCategoryCode,
    taxCategoryName,
    discountFlag: hasDiscount ? '1' : '2', // 1=has discount, 2=no discount
    deemedFlag: isDemed ? '1' : '2', // 1=deemed, 2=not deemed
    exciseFlag: hasExcise ? '1' : '2', // 1=has excise, 2=no excise
    vatApplicableFlag: isOutOfScope ? '0' : '1', // 0=out of scope (11), 1=all others
    taxRate: efrisTaxRate,
  };
}

/**
 * Build EFRIS taxDetails summary (group items by tax category)
 */
export interface EfrisTaxDetailItem {
  taxCategoryCode: string;
  netAmount: number;
  taxRate: string;
  taxAmount: number;
  grossAmount: number;
  taxRateName?: string;
}

export function buildEfrisTaxDetails(
  invoiceItems: Array<{
    netAmount: number;
    taxAmount: number;
    total: number;
    taxRate?: TaxRateForMapping | null;
    exciseDutyCode?: string | null;
    exciseTax?: number;
    exciseRate?: number;
    exciseRule?: string;
    exciseUnit?: string;
    exciseCurrency?: string;
  }>
): EfrisTaxDetailItem[] {
  const taxDetailsMap = new Map<string, EfrisTaxDetailItem>();
  
  for (const item of invoiceItems) {
    const classification = getEfrisTaxClassification(
      item.taxRate || null,
      false,
      item.exciseDutyCode
    );
    
    const key = classification.taxCategoryCode;
    
    if (!taxDetailsMap.has(key)) {
      taxDetailsMap.set(key, {
        taxCategoryCode: classification.taxCategoryCode,
        netAmount: 0,
        taxRate: classification.taxRate,
        taxAmount: 0,
        grossAmount: 0,
      });
    }
    
    const taxDetail = taxDetailsMap.get(key)!;
    taxDetail.netAmount += item.netAmount;
    taxDetail.taxAmount += item.taxAmount;
    taxDetail.grossAmount += item.total;
    
    // If item has excise, add separate excise tax line
    if (item.exciseTax && item.exciseTax > 0) {
      const exciseKey = '05'; // Excise category
      
      // Calculate base net amount (before excise) for items with excise
      // netAmount in itemsForTaxCalc includes excise, so subtract it to get base
      const baseNetForExcise = item.netAmount - item.exciseTax;
      
      if (!taxDetailsMap.has(exciseKey)) {
        // Format excise rate name
        const exciseRateName = item.exciseRate 
          ? formatExciseRateName(
              item.exciseRate,
              (item.exciseRule || '1') as '1' | '2',
              item.exciseUnit,
              item.exciseCurrency
            )
          : 'Excise Duty';
        
        // Determine taxRate based on excise rule
        // Rule 1 = by percentage, Rule 2 = by quantity (fixed amount)
        let exciseTaxRate = '0';
        if (item.exciseRule === '1' && item.exciseRate) {
          // Percentage-based: use the actual rate as decimal
          exciseTaxRate = (item.exciseRate / 100).toFixed(2); // e.g., 10% → "0.10"
        } else {
          // Quantity-based (fixed amount): taxRate is "0"
          exciseTaxRate = '0';
        }
        
        taxDetailsMap.set(exciseKey, {
          taxCategoryCode: '05',
          netAmount: 0,
          taxRate: exciseTaxRate,
          taxAmount: 0,
          grossAmount: 0,
          taxRateName: exciseRateName,
        });
      }
      
      const exciseDetail = taxDetailsMap.get(exciseKey)!;
      exciseDetail.netAmount += baseNetForExcise;
      exciseDetail.taxAmount += item.exciseTax;
      exciseDetail.grossAmount += baseNetForExcise + item.exciseTax;
    }
  }
  
  // Sort tax details: VAT/Standard (01) first, then Excise (05) and others
  const taxDetails = Array.from(taxDetailsMap.values());
  return taxDetails.sort((a, b) => {
    // VAT (01) should come first
    if (a.taxCategoryCode === '01' && b.taxCategoryCode !== '01') return -1;
    if (a.taxCategoryCode !== '01' && b.taxCategoryCode === '01') return 1;
    // Otherwise, sort by category code
    return a.taxCategoryCode.localeCompare(b.taxCategoryCode);
  });
}

/**
 * Format excise rate name for display (T109 requirement)
 */
export function formatExciseRateName(
  exciseRate: number,
  exciseRule: '1' | '2',
  exciseUnit?: string,
  exciseCurrency?: string
): string {
  if (exciseRule === '1') {
    // By percentage
    return `${exciseRate * 100}%`;
  } else {
    // By quantity
    const currency = exciseCurrency || 'UGX';
    const unitNames: Record<string, string> = {
      '101': 'per stick',
      '102': 'per litre',
      '103': 'per kg',
      '104': 'per user per day',
      '105': 'per minute',
      '106': 'per 1,000 sticks',
      '107': 'per 50kgs',
      '109': 'per 1 g',
    };
    
    const unitName = unitNames[exciseUnit || ''] || 'per unit';
    return `${currency}${exciseRate} ${unitName}`;
  }
}

/**
 * Buyer type options for EFRIS
 */
export const BUYER_TYPE_OPTIONS = [
  { value: '0', label: 'B2B (Business to Business)', description: 'TIN required' },
  { value: '1', label: 'B2C (Business to Consumer)', description: 'Default retail customer' },
  { value: '2', label: 'Foreigner', description: 'Non-resident customer' },
  { value: '3', label: 'B2G (Business to Government)', description: 'TIN required' },
];

/**
 * Payment method options for EFRIS
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: '101', label: 'Credit' },
  { value: '102', label: 'Cash' },
  { value: '103', label: 'Cheque' },
  { value: '104', label: 'Demand Draft' },
  { value: '105', label: 'Mobile Money' },
  { value: '106', label: 'Visa/Master Card' },
  { value: '107', label: 'EFT' },
  { value: '108', label: 'POS' },
  { value: '109', label: 'RTGS' },
  { value: '110', label: 'Swift Transfer' },
];
