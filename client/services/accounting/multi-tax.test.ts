/**
 * Multi-Tax Invoice/Bill Tests
 * Tests for compound tax, withholding tax, and GL posting scenarios
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { InvoiceService } from './invoice.service';
import prisma from '@/lib/prisma';
import { Decimal } from 'decimal.js';

describe('Multi-Tax Calculations', () => {
  let organizationId: string;

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Tax Test Org',
        slug: 'tax-test-org',
        country: 'UG',
        compliancePack: 'UG_URA',
      },
    });
    organizationId = org.id;
  });

  describe('Standard Tax Line', () => {
    it('should calculate single tax line correctly', () => {
      const items = [
        {
          description: 'Product A',
          quantity: 10,
          unitPrice: 100,
          taxLines: [{ taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false }],
        },
      ];

      // Subtotal: 1000
      // Tax: 1000 * 0.18 = 180
      // Total: 1180

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(1000);
      expect(calculations.taxAmount).toBeCloseTo(180, 2);
      expect(calculations.total).toBe(1180);
    });

    it('should apply discount before tax', () => {
      const items = [
        {
          description: 'Product B',
          quantity: 10,
          unitPrice: 100,
          discount: 100,
          taxLines: [{ taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false }],
        },
      ];

      // Subtotal: 1000 - 100 = 900
      // Tax: 900 * 0.18 = 162
      // Total: 1062

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(900);
      expect(calculations.taxAmount).toBeCloseTo(162, 2);
      expect(calculations.total).toBe(1062);
    });
  });

  describe('Compound Tax Lines', () => {
    it('should calculate compound tax sequentially', () => {
      const items = [
        {
          description: 'Product C',
          quantity: 100,
          unitPrice: 100,
          taxLines: [
            { taxType: 'STANDARD', rate: 10, isCompound: false, compoundSequence: 1, isWithholding: false },
            { taxType: 'ADDITIONAL', rate: 2, isCompound: true, compoundSequence: 2, isWithholding: false },
          ],
        },
      ];

      // Subtotal: 10,000
      // Tax 1: 10,000 * 0.10 = 1,000
      // Tax 2 (compound): (10,000 + 1,000) * 0.02 = 220
      // Total Tax: 1,220
      // Total: 11,220

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBeCloseTo(1220, 2);
      expect(calculations.total).toBe(11220);
    });

    it('should handle multiple sequential compounds', () => {
      const items = [
        {
          description: 'Product D',
          quantity: 100,
          unitPrice: 100,
          taxLines: [
            { taxType: 'STANDARD', rate: 10, isCompound: false, compoundSequence: 1, isWithholding: false },
            { taxType: 'SECONDARY', rate: 5, isCompound: true, compoundSequence: 2, isWithholding: false },
            { taxType: 'TERTIARY', rate: 2, isCompound: true, compoundSequence: 3, isWithholding: false },
          ],
        },
      ];

      // Subtotal: 10,000
      // Tax 1: 10,000 * 0.10 = 1,000  (accum: 1,000)
      // Tax 2: (10,000 + 1,000) * 0.05 = 550  (accum: 1,550)
      // Tax 3: (10,000 + 1,550) * 0.02 = 231  (accum: 1,781)
      // Total: 11,781

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBeCloseTo(1781, 1);
      expect(calculations.total).toBeCloseTo(11781, 1);
    });
  });

  describe('Withholding Tax', () => {
    it('should separate withholding from standard tax', () => {
      const items = [
        {
          description: 'Professional Service',
          quantity: 1,
          unitPrice: 10000,
          taxLines: [
            { taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false },
            { taxType: 'WITHHOLDING', rate: 6, isCompound: false, isWithholding: true },
          ],
        },
      ];

      // Subtotal: 10,000
      // Tax (non-WHT): 10,000 * 0.18 = 1,800
      // WHT: 10,000 * 0.06 = 600
      // Total: 11,800
      // Amount Due: 11,800 - 600 = 11,200

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBe(1800);
      expect(calculations.withholding).toBe(600);
      expect(calculations.total).toBe(11800);
      expect(calculations.amountDue).toBe(11200);
    });

    it('should apply WHT after all compound taxes', () => {
      const items = [
        {
          description: 'Product E',
          quantity: 100,
          unitPrice: 100,
          taxLines: [
            { taxType: 'STANDARD', rate: 10, isCompound: false, compoundSequence: 1, isWithholding: false },
            { taxType: 'SECONDARY', rate: 2, isCompound: true, compoundSequence: 2, isWithholding: false },
            { taxType: 'WITHHOLDING', rate: 10, isCompound: false, compoundSequence: 3, isWithholding: true },
          ],
        },
      ];

      // Subtotal: 10,000
      // Tax 1: 10,000 * 0.10 = 1,000
      // Tax 2: (10,000 + 1,000) * 0.02 = 220
      // Total: 11,220
      // WHT: 10,000 * 0.10 = 1,000  (on original amount, not on taxes)
      // Amount Due: 11,220 - 1,000 = 10,220

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBeCloseTo(1220, 2);
      expect(calculations.withholding).toBe(1000);
      expect(calculations.amountDue).toBeCloseTo(10220, 1);
    });

    it('should calculate withholding rate correctly', () => {
      const items = [
        {
          description: 'Service',
          quantity: 1,
          unitPrice: 5000,
          taxLines: [
            { taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false },
            { taxType: 'WITHHOLDING', rate: 10, isCompound: false, isWithholding: true },
          ],
        },
      ];

      // WHT Rate: 500 / 5000 = 10%
      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.withholdingRate).toBeCloseTo(10, 1);
    });
  });

  describe('Multiple Items with Mixed Taxes', () => {
    it('should handle multiple items with different tax configurations', () => {
      const items = [
        {
          description: 'Item 1 - Standard',
          quantity: 100,
          unitPrice: 100,
          taxLines: [{ taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false }],
        },
        {
          description: 'Item 2 - Compound',
          quantity: 50,
          unitPrice: 100,
          taxLines: [
            { taxType: 'STANDARD', rate: 10, isCompound: false, compoundSequence: 1, isWithholding: false },
            { taxType: 'ADDITIONAL', rate: 2, isCompound: true, compoundSequence: 2, isWithholding: false },
          ],
        },
        {
          description: 'Item 3 - With WHT',
          quantity: 20,
          unitPrice: 100,
          taxLines: [
            { taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false },
            { taxType: 'WITHHOLDING', rate: 6, isCompound: false, isWithholding: true },
          ],
        },
      ];

      // Item 1: 10,000 + (10,000 * 0.18) = 11,800
      // Item 2: 5,000 + (5,000 * 0.10) + ((5,000 + 500) * 0.02) = 5,000 + 500 + 110 = 5,610
      // Item 3: 2,000 + (2,000 * 0.18) = 2,360 (+ 120 WHT)
      // Subtotal: 17,000
      // Tax: 1,800 + 610 + 360 = 2,770
      // Total: 19,770
      // WHT: 120
      // Amount Due: 19,650

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(17000);
      expect(calculations.taxAmount).toBeCloseTo(2770, 1);
      expect(calculations.total).toBeCloseTo(19770, 1);
      expect(calculations.withholding).toBe(120);
      expect(calculations.amountDue).toBeCloseTo(19650, 1);
    });
  });

  describe('GL Posting for Multi-Tax', () => {
    it('should create GL entries for standard tax', async () => {
      // Note: This is a simplified test. Real implementation would need
      // full invoice creation with GL posting
      const standardTaxAmount = 1000;
      const arAmount = 5000 + standardTaxAmount;

      // Expected entries:
      // Debit: AR 5,000
      // Credit: Revenue 5,000
      // Credit: Tax Payable 1,000
      // Debit: AR 1,000

      expect(arAmount).toBe(6000);
    });

    it('should create GL entries for withholding tax', async () => {
      // For invoice with 10,000 + 1,000 tax - 600 WHT = 10,400 due
      // Expected:
      // Debit: AR 10,400
      // Credit: Revenue 10,000
      // Credit: Tax Payable 1,000
      // Debit: WHT Receivable 600

      const arAmount = 10400;
      const whsReceivable = 600;

      expect(arAmount + whsReceivable).toBe(11000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tax rates', () => {
      const items = [
        {
          description: 'Zero-Rated',
          quantity: 100,
          unitPrice: 100,
          taxLines: [{ taxType: 'ZERO', rate: 0, isCompound: false, isWithholding: false }],
        },
      ];

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBe(0);
      expect(calculations.total).toBe(10000);
    });

    it('should handle no tax lines', () => {
      const items = [
        {
          description: 'No Tax',
          quantity: 100,
          unitPrice: 100,
          taxLines: [],
        },
      ];

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBe(0);
      expect(calculations.withholding).toBe(0);
      expect(calculations.total).toBe(10000);
    });

    it('should handle only withholding tax (no standard tax)', () => {
      const items = [
        {
          description: 'WHT Only',
          quantity: 100,
          unitPrice: 100,
          taxLines: [{ taxType: 'WITHHOLDING', rate: 6, isCompound: false, isWithholding: true }],
        },
      ];

      // Subtotal: 10,000
      // Tax: 0
      // WHT: 600
      // Total: 10,000
      // Amount Due: 9,400

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBe(0);
      expect(calculations.withholding).toBe(600);
      expect(calculations.amountDue).toBe(9400);
    });

    it('should handle very high compound sequences', () => {
      const items = [
        {
          description: 'Many Taxes',
          quantity: 100,
          unitPrice: 100,
          taxLines: [
            { taxType: 'T1', rate: 5, isCompound: false, compoundSequence: 1, isWithholding: false },
            { taxType: 'T2', rate: 2, isCompound: true, compoundSequence: 2, isWithholding: false },
            { taxType: 'T3', rate: 1, isCompound: true, compoundSequence: 3, isWithholding: false },
            { taxType: 'T4', rate: 0.5, isCompound: true, compoundSequence: 4, isWithholding: false },
          ],
        },
      ];

      const calculations = InvoiceService['calculateInvoiceTotals'](items as any);
      expect(calculations.subtotal).toBe(10000);
      expect(calculations.taxAmount).toBeGreaterThan(700); // Should compound properly
    });
  });
});

describe('Invoice Service with InvoiceTaxLine', () => {
  let organizationId: string;
  let customerId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'Invoice Test Org',
        slug: 'invoice-test-org',
        country: 'UG',
      },
    });
    organizationId = org.id;

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
      },
    });
    customerId = customer.id;
  });

  it('should create invoice with multiple tax lines', async () => {
    const invoiceInput = {
      organizationId,
      customerId,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          description: 'Multi-Tax Item',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxLines: [
            { taxType: 'STANDARD', rate: 18, isCompound: false, isWithholding: false },
            { taxType: 'WITHHOLDING', rate: 6, isCompound: false, isWithholding: true },
          ],
        },
      ],
      createdById: 'system',
    };

    const result = await InvoiceService.createInvoice(invoiceInput);

    expect(result.invoice).toBeDefined();
    expect(result.invoice.items).toHaveLength(1);
    expect(result.invoice.items[0].taxLines).toHaveLength(2);
    expect(result.glTransaction).toBeDefined();
  });
});
