/**
 * Tax Calculation Tests
 * 
 * Verify that the tax calculation matches QuickBooks behavior
 */

import { calculateTax, calculateLineItem, recalculateOnToggle } from './tax-calculation';

describe('Tax Calculation - QuickBooks Style', () => {
  describe('calculateTax', () => {
    it('should calculate exclusive tax correctly for the example case', () => {
      const result = calculateTax(10000000, 0.18, false);
      
      expect(result.net).toBe(10000000);
      expect(result.tax).toBe(1800000);
      expect(result.total).toBe(11800000);
      expect(result.net + result.tax).toBe(result.total);
    });

    it('should calculate inclusive tax correctly for the example case', () => {
      const result = calculateTax(10000000, 0.18, true);
      
      expect(result.net).toBe(8474576.27);
      expect(result.tax).toBe(1525423.73);
      expect(result.total).toBe(10000000);
      expect(result.net + result.tax).toBe(result.total);
    });

    it('should ensure Net + Tax = Total for exclusive calculation', () => {
      const result = calculateTax(100.50, 0.15, false);
      
      const sumCheck = parseFloat((result.net + result.tax).toFixed(2));
      expect(sumCheck).toBe(result.total);
    });

    it('should ensure Net + Tax = Total for inclusive calculation', () => {
      const result = calculateTax(100.50, 0.15, true);
      
      const sumCheck = parseFloat((result.net + result.tax).toFixed(2));
      expect(sumCheck).toBe(result.total);
    });

    it('should handle zero tax rate', () => {
      const result = calculateTax(1000, 0, false);
      
      expect(result.net).toBe(1000);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('should handle small amounts with rounding', () => {
      const result = calculateTax(0.99, 0.18, false);
      
      expect(result.net).toBe(0.99);
      expect(result.tax).toBe(0.18);
      expect(result.total).toBe(1.17);
      expect(result.net + result.tax).toBe(result.total);
    });
  });

  describe('calculateLineItem', () => {
    it('should calculate line item with exclusive tax', () => {
      const result = calculateLineItem(10, 1000000, 0.18, false, 0);
      
      expect(result.lineSubtotal).toBe(10000000);
      expect(result.lineDiscount).toBe(0);
      expect(result.lineNet).toBe(10000000);
      expect(result.lineTax).toBe(1800000);
      expect(result.lineTotal).toBe(11800000);
    });

    it('should calculate line item with inclusive tax', () => {
      const result = calculateLineItem(10, 847457.627, 0.18, true, 0);
      
      // Unit price includes tax, so net should be extracted
      expect(result.lineNet).toBeCloseTo(7181862.94, 2);
      expect(result.lineTax).toBeCloseTo(1292735.33, 2);
      expect(result.lineTotal).toBeCloseTo(8474598.27, 2);
    });

    it('should apply discount correctly with exclusive tax', () => {
      const result = calculateLineItem(10, 100, 0.18, false, 50);
      
      expect(result.lineSubtotal).toBe(1000);
      expect(result.lineDiscount).toBe(50);
      expect(result.lineNet).toBe(950);
      expect(result.lineTax).toBe(171);
      expect(result.lineTotal).toBe(1121);
    });

    it('should handle quantity of 1', () => {
      const result = calculateLineItem(1, 10000000, 0.18, false, 0);
      
      expect(result.lineNet).toBe(10000000);
      expect(result.lineTax).toBe(1800000);
      expect(result.lineTotal).toBe(11800000);
    });
  });

  describe('recalculateOnToggle', () => {
    it('should preserve total when toggling from exclusive to inclusive', () => {
      // Start with exclusive: Net = 10,000,000, Total = 11,800,000
      const exclusiveResult = calculateTax(10000000, 0.18, false);
      
      // Toggle to inclusive, preserving the total
      const inclusiveResult = recalculateOnToggle(exclusiveResult.total, 0.18, 'INCLUSIVE');
      
      expect(inclusiveResult.total).toBe(11800000);
      expect(inclusiveResult.net).toBeCloseTo(10000000, 2);
      expect(inclusiveResult.tax).toBeCloseTo(1800000, 2);
    });

    it('should preserve total when toggling from inclusive to exclusive', () => {
      // Start with inclusive: Total = 10,000,000
      const inclusiveResult = calculateTax(10000000, 0.18, true);
      
      // Toggle to exclusive, preserving the total
      const exclusiveResult = recalculateOnToggle(inclusiveResult.total, 0.18, 'EXCLUSIVE');
      
      expect(exclusiveResult.total).toBe(10000000);
      expect(exclusiveResult.net).toBeCloseTo(8474576.27, 2);
      expect(exclusiveResult.tax).toBeCloseTo(1525423.73, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const result = calculateTax(999999999, 0.18, false);
      
      expect(result.net).toBe(999999999);
      expect(result.tax).toBe(179999999.82);
      expect(result.total).toBe(1179999998.82);
      expect(result.net + result.tax).toBe(result.total);
    });

    it('should handle high tax rates', () => {
      const result = calculateTax(1000, 0.5, false);
      
      expect(result.net).toBe(1000);
      expect(result.tax).toBe(500);
      expect(result.total).toBe(1500);
    });

    it('should handle decimal amounts correctly', () => {
      const result = calculateTax(99.99, 0.18, false);
      
      expect(result.net).toBe(99.99);
      expect(result.tax).toBe(18);
      expect(result.total).toBe(117.99);
    });
  });
});
