/**
 * Tax Calculation Utility - QuickBooks Style
 * 
 * Handles Inclusive and Exclusive tax calculations with proper rounding
 * to ensure Net + Tax = Total exactly (no penny differences)
 */

import { Decimal } from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface TaxCalculationInput {
  amount: number;
  rate: number;
  isInclusive: boolean;
}

export interface TaxCalculationResult {
  net: number;
  tax: number;
  total: number;
  effectiveRate: number;
}

/**
 * Calculate tax based on amount, rate, and inclusive/exclusive mode
 * 
 * @param amount - The input amount (Net if Exclusive, Total if Inclusive)
 * @param rate - The tax rate as a decimal (e.g., 0.18 for 18%)
 * @param isInclusive - Whether the amount includes tax
 * @returns Calculated net, tax, and total amounts
 */
export function calculateTax(
  amount: number,
  rate: number,
  isInclusive: boolean
): TaxCalculationResult {
  const amountDecimal = new Decimal(amount);
  const rateDecimal = new Decimal(rate);

  let net: Decimal;
  let tax: Decimal;
  let total: Decimal;

  if (isInclusive) {
    // Inclusive: Total = Amount, Net = Total / (1 + Rate), Tax = Total - Net
    total = amountDecimal;
    net = total.dividedBy(rateDecimal.plus(1));
    tax = total.minus(net);
  } else {
    // Exclusive: Net = Amount, Tax = Net * Rate, Total = Net + Tax
    net = amountDecimal;
    tax = net.times(rateDecimal);
    total = net.plus(tax);
  }

  // Round to 2 decimal places (financial rounding)
  const netRounded = new Decimal(net.toFixed(2));
  const taxRounded = new Decimal(tax.toFixed(2));
  const totalRounded = new Decimal(total.toFixed(2));

  // Ensure Net + Tax = Total exactly (adjust tax if needed for penny differences)
  const calculatedTotal = netRounded.plus(taxRounded);
  let finalTax = taxRounded;
  
  if (!calculatedTotal.equals(totalRounded)) {
    // Adjust tax to ensure perfect balance
    finalTax = totalRounded.minus(netRounded);
  }

  return {
    net: netRounded.toNumber(),
    tax: finalTax.toNumber(),
    total: totalRounded.toNumber(),
    effectiveRate: rate,
  };
}

/**
 * Calculate line item totals with tax
 * 
 * @param quantity - Item quantity
 * @param unitPrice - Price per unit
 * @param taxRate - Tax rate as decimal (e.g., 0.18 for 18%)
 * @param isInclusive - Whether unit price includes tax
 * @param discount - Optional discount amount
 * @returns Line item calculation breakdown
 */
export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  isInclusive: boolean,
  discount: number = 0
): {
  lineSubtotal: number;
  lineDiscount: number;
  lineNet: number;
  lineTax: number;
  lineTotal: number;
} {
  const qty = new Decimal(quantity);
  const price = new Decimal(unitPrice);
  const disc = new Decimal(discount);

  // Calculate subtotal (quantity * unitPrice)
  const lineSubtotal = qty.times(price);
  
  // If inclusive, the unitPrice already includes tax
  // So we need to extract the net amount first
  if (isInclusive) {
    const rate = new Decimal(taxRate);
    // Extract net from unit price
    const netUnitPrice = price.dividedBy(rate.plus(1));
    const netSubtotal = qty.times(netUnitPrice);
    const lineNet = netSubtotal.minus(disc);
    
    // Calculate tax on the net amount
    const lineTax = lineNet.times(rate);
    const lineTotal = lineNet.plus(lineTax);
    
    return {
      lineSubtotal: new Decimal(lineSubtotal.toFixed(2)).toNumber(),
      lineDiscount: new Decimal(disc.toFixed(2)).toNumber(),
      lineNet: new Decimal(lineNet.toFixed(2)).toNumber(),
      lineTax: new Decimal(lineTax.toFixed(2)).toNumber(),
      lineTotal: new Decimal(lineTotal.toFixed(2)).toNumber(),
    };
  } else {
    // Exclusive: discount applies to gross, then calculate tax
    const lineNet = lineSubtotal.minus(disc);
    const rate = new Decimal(taxRate);
    const lineTax = lineNet.times(rate);
    const lineTotal = lineNet.plus(lineTax);
    
    return {
      lineSubtotal: new Decimal(lineSubtotal.toFixed(2)).toNumber(),
      lineDiscount: new Decimal(disc.toFixed(2)).toNumber(),
      lineNet: new Decimal(lineNet.toFixed(2)).toNumber(),
      lineTax: new Decimal(lineTax.toFixed(2)).toNumber(),
      lineTotal: new Decimal(lineTotal.toFixed(2)).toNumber(),
    };
  }
}

/**
 * Recalculate totals when switching between Inclusive/Exclusive
 * 
 * When the user toggles the mode, the Total should stay the same,
 * but Net and Tax should be recalculated.
 * 
 * @param currentTotal - The current total amount
 * @param taxRate - Tax rate as decimal
 * @param newMode - The new mode ('INCLUSIVE' or 'EXCLUSIVE')
 * @returns Recalculated amounts
 */
export function recalculateOnToggle(
  currentTotal: number,
  taxRate: number,
  newMode: 'INCLUSIVE' | 'EXCLUSIVE'
): TaxCalculationResult {
  // When toggling, we preserve the total and recalculate net and tax
  const isInclusive = newMode === 'INCLUSIVE';
  return calculateTax(currentTotal, taxRate, isInclusive);
}

/**
 * Format currency with proper decimal places
 */
export function formatAmount(amount: number, decimals: number = 2): string {
  return new Decimal(amount).toFixed(decimals);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return new Decimal(value).dividedBy(total).times(100).toNumber();
}

/**
 * Test the calculation against the example case
 * 
 * Input: Amount: 10,000,000, Rate: 0.18
 * 
 * Exclusive: Net: 10,000,000, Tax: 1,800,000, Total: 11,800,000
 * Inclusive: Net: 8,474,576.27, Tax: 1,525,423.73, Total: 10,000,000
 */
export function runTestCase(): void {
  console.log('=== Tax Calculation Test Cases ===\n');
  
  const amount = 10000000;
  const rate = 0.18;
  
  // Test Exclusive
  const exclusive = calculateTax(amount, rate, false);
  console.log('Exclusive (Amount = Net):');
  console.log(`  Net:   ${formatAmount(exclusive.net)}`);
  console.log(`  Tax:   ${formatAmount(exclusive.tax)}`);
  console.log(`  Total: ${formatAmount(exclusive.total)}`);
  console.log(`  Verification: ${exclusive.net + exclusive.tax === exclusive.total ? '✓' : '✗'}`);
  
  // Expected: Net: 10,000,000, Tax: 1,800,000, Total: 11,800,000
  const exclusivePass = 
    exclusive.net === 10000000 &&
    exclusive.tax === 1800000 &&
    exclusive.total === 11800000;
  console.log(`  Result: ${exclusivePass ? '✓ PASS' : '✗ FAIL'}\n`);
  
  // Test Inclusive
  const inclusive = calculateTax(amount, rate, true);
  console.log('Inclusive (Amount = Total):');
  console.log(`  Net:   ${formatAmount(inclusive.net)}`);
  console.log(`  Tax:   ${formatAmount(inclusive.tax)}`);
  console.log(`  Total: ${formatAmount(inclusive.total)}`);
  console.log(`  Verification: ${inclusive.net + inclusive.tax === inclusive.total ? '✓' : '✗'}`);
  
  // Expected: Net: 8,474,576.27, Tax: 1,525,423.73, Total: 10,000,000
  const inclusivePass = 
    inclusive.net === 8474576.27 &&
    inclusive.tax === 1525423.73 &&
    inclusive.total === 10000000;
  console.log(`  Result: ${inclusivePass ? '✓ PASS' : '✗ FAIL'}\n`);
  
  console.log('=== End Test Cases ===');
}
