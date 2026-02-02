/**
 * TaxCalculationService
 * 
 * Country-blind tax calculation engine supporting both INCLUSIVE and EXCLUSIVE tax methods.
 * Implements QuickBooks-style tax calculation with precise mathematical formulas.
 * 
 * EXCLUSIVE (Tax is added on top):
 *   Net Amount = Unit Price × Quantity
 *   Tax Amount = Net Amount × Tax Rate
 *   Gross Amount = Net Amount + Tax Amount
 *   Example: €10,000 + 18% = €11,800
 * 
 * INCLUSIVE (Tax is embedded in price):
 *   Gross Amount = Unit Price × Quantity
 *   Net Amount = Gross Amount / (1 + Tax Rate)
 *   Tax Amount = Gross Amount - Net Amount
 *   Example: €10,000 includes €1,525.42 tax at 18%
 * 
 * Key Design Principles:
 * 1. Country-Blind: Does not care about jurisdiction, only math
 * 2. Precision: Uses Decimal for financial accuracy
 * 3. Reversible: Can convert between inclusive/exclusive without data loss
 * 4. GL-Ready: Always returns separate net and tax for posting
 * 5. Audit Trail: Preserves entered price and calculation method
 */

import { Decimal } from '@prisma/client/runtime/library';

export type TaxCalculationMethod = 'EXCLUSIVE' | 'INCLUSIVE';

export interface TaxCalculationInput {
  unitPrice: number | Decimal;
  quantity: number | Decimal;
  taxRate: number | Decimal; // Percentage (e.g., 18 for 18%)
  discount?: number | Decimal;
  calculationMethod: TaxCalculationMethod;
}

export interface TaxCalculationResult {
  // Entered Values
  unitPrice: Decimal;
  quantity: Decimal;
  discount: Decimal;
  taxRate: Decimal;
  calculationMethod: TaxCalculationMethod;
  
  // Calculated Values
  netAmount: Decimal;       // Revenue amount (always net of tax)
  taxAmount: Decimal;       // Tax to collect/remit
  grossAmount: Decimal;     // Total amount (net + tax)
  
  // Line Item Breakdown
  lineNetAmount: Decimal;   // Net for this line before tax
  lineTaxAmount: Decimal;   // Tax for this line
  lineTotal: Decimal;       // Gross total for this line
  
  // Metadata for display
  effectiveUnitPrice: Decimal; // Net unit price (useful for profit calculations)
  taxPercentage: Decimal;      // Tax rate as decimal (e.g., 0.18)
}

export class TaxCalculationService {
  /**
   * Calculate tax for a line item using specified method
   */
  static calculateLineItem(input: TaxCalculationInput): TaxCalculationResult {
    const unitPrice = new Decimal(input.unitPrice.toString());
    const quantity = new Decimal(input.quantity.toString());
    const taxRate = new Decimal(input.taxRate.toString());
    const discount = input.discount ? new Decimal(input.discount.toString()) : new Decimal(0);
    const taxPercentage = taxRate.div(100); // Convert percentage to decimal

    let netAmount: Decimal;
    let taxAmount: Decimal;
    let grossAmount: Decimal;
    let effectiveUnitPrice: Decimal;

    if (input.calculationMethod === 'EXCLUSIVE') {
      // TAX EXCLUSIVE: Tax is added on top
      // Net = (Unit Price × Quantity) - Discount
      // Tax = Net × Rate
      // Gross = Net + Tax
      
      const subtotal = unitPrice.mul(quantity);
      netAmount = subtotal.sub(discount);
      taxAmount = netAmount.mul(taxPercentage);
      grossAmount = netAmount.add(taxAmount);
      effectiveUnitPrice = quantity.gt(0) ? netAmount.div(quantity) : new Decimal(0);
      
    } else {
      // TAX INCLUSIVE: Tax is embedded in the price
      // Gross = (Unit Price × Quantity) - Discount
      // Net = Gross / (1 + Rate)
      // Tax = Gross - Net
      
      const subtotal = unitPrice.mul(quantity);
      grossAmount = subtotal.sub(discount);
      netAmount = grossAmount.div(new Decimal(1).add(taxPercentage));
      taxAmount = grossAmount.sub(netAmount);
      effectiveUnitPrice = quantity.gt(0) ? netAmount.div(quantity) : new Decimal(0);
    }

    return {
      // Input values
      unitPrice,
      quantity,
      discount,
      taxRate,
      calculationMethod: input.calculationMethod,
      
      // Calculated totals
      netAmount,
      taxAmount,
      grossAmount,
      
      // Line item values
      lineNetAmount: netAmount,
      lineTaxAmount: taxAmount,
      lineTotal: grossAmount,
      
      // Metadata
      effectiveUnitPrice,
      taxPercentage,
    };
  }

  /**
   * Calculate tax for multiple line items
   */
  static calculateInvoice(items: TaxCalculationInput[]): {
    items: TaxCalculationResult[];
    totals: {
      netAmount: Decimal;
      taxAmount: Decimal;
      grossAmount: Decimal;
      totalDiscount: Decimal;
    };
  } {
    const calculatedItems = items.map(item => this.calculateLineItem(item));
    
    const totals = calculatedItems.reduce(
      (acc, item) => ({
        netAmount: acc.netAmount.add(item.netAmount),
        taxAmount: acc.taxAmount.add(item.taxAmount),
        grossAmount: acc.grossAmount.add(item.grossAmount),
        totalDiscount: acc.totalDiscount.add(item.discount),
      }),
      {
        netAmount: new Decimal(0),
        taxAmount: new Decimal(0),
        grossAmount: new Decimal(0),
        totalDiscount: new Decimal(0),
      }
    );

    return { items: calculatedItems, totals };
  }

  /**
   * Convert price from EXCLUSIVE to INCLUSIVE
   * Use case: User has net price and wants to display tax-inclusive price
   */
  static convertToInclusive(netPrice: number | Decimal, taxRate: number | Decimal): Decimal {
    const net = new Decimal(netPrice.toString());
    const rate = new Decimal(taxRate.toString()).div(100);
    return net.mul(new Decimal(1).add(rate));
  }

  /**
   * Extract net amount from INCLUSIVE price
   * Use case: User has gross price and needs to know the net amount
   */
  static extractNetFromInclusive(grossPrice: number | Decimal, taxRate: number | Decimal): Decimal {
    const gross = new Decimal(grossPrice.toString());
    const rate = new Decimal(taxRate.toString()).div(100);
    return gross.div(new Decimal(1).add(rate));
  }

  /**
   * Calculate tax amount from net price (EXCLUSIVE method)
   */
  static calculateExclusiveTax(netPrice: number | Decimal, taxRate: number | Decimal): Decimal {
    const net = new Decimal(netPrice.toString());
    const rate = new Decimal(taxRate.toString()).div(100);
    return net.mul(rate);
  }

  /**
   * Calculate tax amount from gross price (INCLUSIVE method)
   */
  static calculateInclusiveTax(grossPrice: number | Decimal, taxRate: number | Decimal): Decimal {
    const gross = new Decimal(grossPrice.toString());
    const rate = new Decimal(taxRate.toString()).div(100);
    const net = gross.div(new Decimal(1).add(rate));
    return gross.sub(net);
  }

  /**
   * Recalculate line item when switching between INCLUSIVE and EXCLUSIVE
   * Preserves the entered unit price but changes the interpretation
   */
  static switchCalculationMethod(
    currentResult: TaxCalculationResult,
    newMethod: TaxCalculationMethod
  ): TaxCalculationResult {
    // When switching methods, we keep the unitPrice as-is
    // but recalculate everything else with the new method
    return this.calculateLineItem({
      unitPrice: currentResult.unitPrice,
      quantity: currentResult.quantity,
      taxRate: currentResult.taxRate,
      discount: currentResult.discount,
      calculationMethod: newMethod,
    });
  }

  /**
   * Validate that a calculated result is mathematically correct
   * Useful for debugging and audit purposes
   */
  static validateCalculation(result: TaxCalculationResult): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check: Net + Tax should equal Gross
    const calculatedGross = result.netAmount.add(result.taxAmount);
    if (!calculatedGross.equals(result.grossAmount)) {
      errors.push(
        `Gross amount mismatch: ${result.netAmount} + ${result.taxAmount} ≠ ${result.grossAmount}`
      );
    }

    // Check: Tax should be Net × Rate (for EXCLUSIVE) or validated differently for INCLUSIVE
    if (result.calculationMethod === 'EXCLUSIVE') {
      const expectedTax = result.netAmount.mul(result.taxPercentage);
      const diff = result.taxAmount.sub(expectedTax).abs();
      if (diff.gt(0.01)) {
        // Allow 1 cent rounding difference
        errors.push(
          `Tax amount incorrect for EXCLUSIVE: expected ${expectedTax}, got ${result.taxAmount}`
        );
      }
    }

    // Check: Amounts should be non-negative (except discount)
    if (result.netAmount.lt(0)) {
      errors.push('Net amount is negative');
    }
    if (result.taxAmount.lt(0)) {
      errors.push('Tax amount is negative');
    }
    if (result.grossAmount.lt(0)) {
      errors.push('Gross amount is negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format calculation result for display
   */
  static formatForDisplay(result: TaxCalculationResult, currencySymbol: string = '$'): {
    unitPrice: string;
    netAmount: string;
    taxAmount: string;
    grossAmount: string;
    method: string;
  } {
    const format = (amount: Decimal) => 
      `${currencySymbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

    return {
      unitPrice: format(result.unitPrice),
      netAmount: format(result.netAmount),
      taxAmount: format(result.taxAmount),
      grossAmount: format(result.grossAmount),
      method: result.calculationMethod === 'EXCLUSIVE' ? 'Tax Exclusive' : 'Tax Inclusive',
    };
  }

  /**
   * Get tax breakdown for EFRIS/e-Invoicing submission
   * Returns structured data with separate net and tax for each tax rate
   */
  static getTaxBreakdown(items: TaxCalculationResult[]): {
    taxRate: Decimal;
    netAmount: Decimal;
    taxAmount: Decimal;
    grossAmount: Decimal;
    itemCount: number;
  }[] {
    // Group by tax rate
    const grouped = items.reduce((acc, item) => {
      const key = item.taxRate.toString();
      if (!acc[key]) {
        acc[key] = {
          taxRate: item.taxRate,
          netAmount: new Decimal(0),
          taxAmount: new Decimal(0),
          grossAmount: new Decimal(0),
          itemCount: 0,
        };
      }
      acc[key].netAmount = acc[key].netAmount.add(item.netAmount);
      acc[key].taxAmount = acc[key].taxAmount.add(item.taxAmount);
      acc[key].grossAmount = acc[key].grossAmount.add(item.grossAmount);
      acc[key].itemCount += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }

  /**
   * Calculate effective tax rate for a mixed invoice
   * Useful for summary displays
   */
  static calculateEffectiveRate(items: TaxCalculationResult[]): Decimal {
    const totalNet = items.reduce((sum, item) => sum.add(item.netAmount), new Decimal(0));
    const totalTax = items.reduce((sum, item) => sum.add(item.taxAmount), new Decimal(0));
    
    if (totalNet.lte(0)) return new Decimal(0);
    
    return totalTax.div(totalNet).mul(100); // Return as percentage
  }
}
