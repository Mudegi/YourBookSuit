/**
 * Tax Calculator - QuickBooks-style Inclusive/Exclusive Tax Calculation
 * 
 * This utility handles tax calculations exactly like QuickBooks with
 * support for both Inclusive and Exclusive tax methods.
 * 
 * Key Features:
 * - Financial rounding to 2 decimal places
 * - Ensures Net + Tax = Total (no penny differences)
 * - State management for UI toggle between Inclusive/Exclusive
 * - Separate storage of Net, Tax, and Total in database
 */

export type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE';

export interface TaxCalculationInput {
  amount: number;        // The "Amount" entered by user
  rate: number;          // Tax rate as decimal (e.g., 0.18 for 18%)
  isInclusive: boolean;  // Tax mode
  quantity?: number;     // Optional quantity multiplier
  discount?: number;     // Optional discount amount
}

export interface TaxCalculationResult {
  net: number;           // Net Amount (for revenue/GL posting)
  tax: number;           // Tax Amount (for tax liability/GL posting)
  total: number;         // Total Amount (net + tax)
  rate: number;          // Tax rate used
  mode: TaxMode;         // Calculation mode used
}

/**
 * Round to 2 decimal places using financial rounding (half-up)
 */
function roundFinancial(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate tax using the specified method
 * 
 * @param amount - The amount entered by the user
 * @param rate - Tax rate as decimal (e.g., 0.18 for 18%)
 * @param isInclusive - Whether tax is inclusive or exclusive
 * @returns TaxCalculationResult with net, tax, and total
 */
export function calculateTax(
  amount: number,
  rate: number,
  isInclusive: boolean
): TaxCalculationResult {
  let net: number;
  let tax: number;
  let total: number;

  if (isInclusive) {
    // INCLUSIVE: Total = Amount, calculate Net and Tax
    // Net = Total / (1 + Rate)
    // Tax = Total - Net
    total = roundFinancial(amount);
    net = roundFinancial(total / (1 + rate));
    tax = roundFinancial(total - net);
    
    // Ensure precision: adjust tax to ensure Net + Tax = Total exactly
    const calculatedTotal = roundFinancial(net + tax);
    if (calculatedTotal !== total) {
      tax = roundFinancial(total - net);
    }
  } else {
    // EXCLUSIVE: Net = Amount, calculate Tax and Total
    // Tax = Net × Rate
    // Total = Net + Tax
    net = roundFinancial(amount);
    tax = roundFinancial(net * rate);
    total = roundFinancial(net + tax);
    
    // Ensure precision: adjust total to ensure Net + Tax = Total exactly
    const calculatedTotal = roundFinancial(net + tax);
    if (calculatedTotal !== total) {
      total = roundFinancial(net + tax);
    }
  }

  return {
    net,
    tax,
    total,
    rate,
    mode: isInclusive ? 'INCLUSIVE' : 'EXCLUSIVE',
  };
}

/**
 * Calculate tax for a line item with quantity and discount
 * 
 * @param unitAmount - Unit price entered by user
 * @param quantity - Quantity
 * @param rate - Tax rate as decimal (e.g., 0.18)
 * @param isInclusive - Whether tax is inclusive
 * @param discount - Optional discount amount
 * @returns TaxCalculationResult
 */
export function calculateLineTax(
  unitAmount: number,
  quantity: number,
  rate: number,
  isInclusive: boolean,
  discount: number = 0
): TaxCalculationResult {
  // Calculate line amount before discount
  const lineAmount = unitAmount * quantity;
  
  // Apply discount
  const amountAfterDiscount = lineAmount - discount;
  
  // Calculate tax on the discounted amount
  return calculateTax(amountAfterDiscount, rate, isInclusive);
}

/**
 * Recalculate when user toggles between Inclusive and Exclusive
 * This keeps the Total the same but recalculates Net and Tax
 * 
 * @param currentTotal - Current total amount
 * @param rate - Tax rate
 * @param newMode - New tax calculation mode
 * @returns TaxCalculationResult with new Net and Tax
 */
export function recalculateOnToggle(
  currentTotal: number,
  rate: number,
  newMode: TaxMode
): TaxCalculationResult {
  if (newMode === 'INCLUSIVE') {
    // When switching to Inclusive, Total stays same
    // Recalculate Net and Tax from Total
    return calculateTax(currentTotal, rate, true);
  } else {
    // When switching to Exclusive, we need to back-calculate
    // to find what Net would give us this Total
    // Total = Net + (Net × Rate)
    // Total = Net × (1 + Rate)
    // Net = Total / (1 + Rate)
    const net = roundFinancial(currentTotal / (1 + rate));
    return calculateTax(net, rate, false);
  }
}

/**
 * Calculate invoice totals from multiple line items
 * 
 * @param lineItems - Array of line calculation results
 * @returns Aggregated totals
 */
export function calculateInvoiceTotals(
  lineItems: TaxCalculationResult[]
): {
  subtotal: number;    // Sum of all Net amounts
  totalTax: number;    // Sum of all Tax amounts
  total: number;       // Sum of all Totals
} {
  const subtotal = roundFinancial(
    lineItems.reduce((sum, item) => sum + item.net, 0)
  );
  
  const totalTax = roundFinancial(
    lineItems.reduce((sum, item) => sum + item.tax, 0)
  );
  
  const total = roundFinancial(
    lineItems.reduce((sum, item) => sum + item.total, 0)
  );
  
  return { subtotal, totalTax, total };
}

/**
 * Get the display amount for the UI "Amount" column
 * - If Exclusive: shows Net (what you entered)
 * - If Inclusive: shows Total (what you entered)
 * 
 * @param result - Tax calculation result
 * @returns The amount to display in the Amount column
 */
export function getDisplayAmount(result: TaxCalculationResult): number {
  return result.mode === 'INCLUSIVE' ? result.total : result.net;
}

/**
 * Validate calculation integrity
 * Ensures Net + Tax = Total with no penny differences
 * 
 * @param result - Tax calculation result to validate
 * @returns true if valid, false if there's a discrepancy
 */
export function validateCalculation(result: TaxCalculationResult): boolean {
  const calculatedTotal = roundFinancial(result.net + result.tax);
  return calculatedTotal === result.total;
}

/**
 * Format tax calculation for database storage
 * Always stores Net, Tax, and Total separately
 */
export function formatForStorage(result: TaxCalculationResult): {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  taxCalculationMethod: TaxMode;
} {
  return {
    netAmount: result.net,
    taxAmount: result.tax,
    totalAmount: result.total,
    taxRate: result.rate,
    taxCalculationMethod: result.mode,
  };
}

// Example usage and test
if (require.main === module) {
  console.log('Testing Tax Calculator\n');
  
  // Test Case from requirements
  const testAmount = 10_000_000;
  const testRate = 0.18;
  
  console.log('Input:', { amount: testAmount, rate: testRate });
  console.log('');
  
  // Test Exclusive
  const exclusive = calculateTax(testAmount, testRate, false);
  console.log('EXCLUSIVE Result:');
  console.log('  Net:', exclusive.net.toLocaleString());
  console.log('  Tax:', exclusive.tax.toLocaleString());
  console.log('  Total:', exclusive.total.toLocaleString());
  console.log('  Valid:', validateCalculation(exclusive));
  console.log('');
  
  // Test Inclusive
  const inclusive = calculateTax(testAmount, testRate, true);
  console.log('INCLUSIVE Result:');
  console.log('  Net:', inclusive.net.toLocaleString());
  console.log('  Tax:', inclusive.tax.toLocaleString());
  console.log('  Total:', inclusive.total.toLocaleString());
  console.log('  Valid:', validateCalculation(inclusive));
  console.log('');
  
  // Expected results
  console.log('Expected EXCLUSIVE: Net: 10,000,000, Tax: 1,800,000, Total: 11,800,000');
  console.log('Expected INCLUSIVE: Net: 8,474,576.27, Tax: 1,525,423.73, Total: 10,000,000');
}
