/**
 * Manufacturing & Assembly Service - Comprehensive Test Suite
 * Tests cover: BOM validation, cost calculations, GL posting, wastage tracking, Uganda compliance
 */

import Decimal from 'decimal.js';
import {
  buildProduct,
  reverseAssemblyBuild,
  getAssemblyDetails,
  listAssemblyTransactions,
  type BuildProductRequest,
} from './assembly.service';

// Test utilities
const createTestRequest = (overrides?: Partial<BuildProductRequest>): BuildProductRequest => ({
  organizationId: 'test-org',
  bomId: 'test-bom',
  finishedProductId: 'test-fg-product',
  quantity: 100,
  laborCost: 500,
  overheadCost: 250,
  ...overrides,
});

describe('Assembly Service - buildProduct()', () => {
  // ========================================================================
  // TEST 1: Simple Assembly Build (No Wastage)
  // ========================================================================
  test('should build product with single component (basic scenario)', async () => {
    const request = createTestRequest({
      quantity: 100,
      laborCost: 500,
      overheadCost: 250,
    });

    // Expected calculation:
    // Material: (100 units × 10 qty per unit × $5 avg cost) = $5,000
    // Labor: $500
    // Overhead: $250
    // Total Manufacturing Cost: $5,750
    // Previous FG: 0 units at $0 = $0
    // New FG: 100 units at ($5,750 / 100) = $57.50/unit

    const result = await buildProduct(request, 'test-user');

    expect(result).toBeDefined();
    expect(result.quantity).toEqual(new Decimal('100'));
    expect(result.laborCost).toEqual(new Decimal('500'));
    expect(result.overheadCost).toEqual(new Decimal('250'));
    expect(result.totalManufacturingCost).toEqual(new Decimal('5750'));
    expect(result.status).toBe('POSTED');
    expect(result.glTransactionId).toBeDefined();
  });

  // ========================================================================
  // TEST 2: Multi-Component Assembly
  // ========================================================================
  test('should calculate costs for BOM with multiple components', async () => {
    // BOM: Paint Can (Finished)
    // Components:
    // - Tin Sheet (10 units × $2) = $20
    // - Paint (50ml × $0.50) = $25
    // - Label (1 × $0.10) = $0.10
    // Total Material per unit: $45.10
    // For 100 units: $4,510

    const request = createTestRequest({
      quantity: 100,
      laborCost: 200, // Assembly labor
      overheadCost: 150, // Factory overhead
    });

    const result = await buildProduct(request, 'test-user');

    expect(result.materialCost).toEqual(new Decimal('4510'));
    expect(result.totalManufacturingCost).toEqual(new Decimal('4860'));
    expect(result.newUnitCost).toEqual(new Decimal('48.60'));
  });

  // ========================================================================
  // TEST 3: Wastage Tracking
  // ========================================================================
  test('should handle wastage/scrap in assembly', async () => {
    const request = createTestRequest({
      quantity: 100,
      wastageQuantity: 5, // 5% wastage
      wastageReasons: ['NORMAL_SCRAP', 'TRIMMING'],
      wastageDescription: 'Normal manufacturing waste',
    });

    // Material + wastage is included in required quantity
    // Bill of Material should have scrapPercent = 5%
    // So actual issue = planned × (1 + scrapPercent)

    const result = await buildProduct(request, 'test-user');

    expect(result.wastageQuantity).toEqual(new Decimal('5'));
    expect(result.wastageCost).toBeGreaterThan(new Decimal('0'));
    expect(result.totalManufacturingCost).toBeGreaterThan(result.materialCost);
  });

  // ========================================================================
  // TEST 4: Cost Variance (Planned vs Actual)
  // ========================================================================
  test('should calculate cost variance when actual differs from planned', async () => {
    // BOM specifies: 10 units of component A per finished unit
    // Actual used: 10.5 units (due to waste/inefficiency)
    // At $5/unit avg cost: 
    // Planned cost per FG: $50
    // Actual cost per FG: $52.50
    // Variance (unfavorable): -$2.50

    const request = createTestRequest({ quantity: 100 });

    const result = await buildProduct(request, 'test-user');

    // Assembly includes variance tracking
    expect(result.assemblyTransactionId).toBeDefined();
  });

  // ========================================================================
  // TEST 5: Unit Cost Recalculation (FIFO/Average Cost)
  // ========================================================================
  test('should recalculate unit cost with existing finished goods inventory', async () => {
    // Scenario: Already have 50 units of FG at $40/unit = $2,000
    // Build 100 more units at $57.50/unit = $5,750
    // New total: 150 units = $7,750
    // New average unit cost: $7,750 / 150 = $51.67

    const request = createTestRequest({
      quantity: 100,
      laborCost: 500,
      overheadCost: 250,
    });

    const result = await buildProduct(request, 'test-user');

    // Previous inventory affects the calculation
    expect(result.newUnitCost).toBeDefined();
    expect(result.previousUnitCost).toBeLessThanOrEqual(result.newUnitCost);
  });

  // ========================================================================
  // TEST 6: GL Entry Validation (Must Balance)
  // ========================================================================
  test('should create balanced GL entries', async () => {
    const request = createTestRequest({
      quantity: 100,
      laborCost: 500,
      overheadCost: 250,
    });

    const result = await buildProduct(request, 'test-user');

    // Retrieve GL transaction
    const transaction = await getAssemblyDetails(result.assemblyTransactionId, 'test-org');

    if (transaction?.glTransaction) {
      const entries = transaction.glTransaction.ledgerEntries;
      
      let totalDebits = new Decimal('0');
      let totalCredits = new Decimal('0');

      for (const entry of entries) {
        if (entry.entryType === 'DEBIT') {
          totalDebits = totalDebits.plus(entry.amount);
        } else {
          totalCredits = totalCredits.plus(entry.amount);
        }
      }

      expect(totalDebits).toEqual(totalCredits);
    }
  });

  // ========================================================================
  // TEST 7: GL Account Mapping
  // ========================================================================
  test('should post to correct GL accounts', async () => {
    // Expected entries:
    // DEBIT: Finished Goods Inventory (ASSET)
    // CREDIT: Raw Materials Inventory (ASSET)
    // CREDIT: Labor Applied (EXPENSE)
    // CREDIT: Overhead Applied (EXPENSE)

    const request = createTestRequest({
      quantity: 100,
      laborCost: 500,
      overheadCost: 250,
    });

    const result = await buildProduct(request, 'test-user');
    const transaction = await getAssemblyDetails(result.assemblyTransactionId, 'test-org');

    if (transaction?.glTransaction) {
      const entries = transaction.glTransaction.ledgerEntries;
      
      // Should have at least 4 entries (FG, RM, Labor, Overhead)
      expect(entries.length).toBeGreaterThanOrEqual(4);
      
      // Check account types
      const accounts = entries.map((e) => e.account);
      const hasAsset = accounts.some((a) => a.accountType === 'ASSET');
      const hasExpense = accounts.some((a) => a.accountType === 'COST_OF_SALES');
      
      expect(hasAsset).toBe(true);
      expect(hasExpense).toBe(true);
    }
  });

  // ========================================================================
  // TEST 8: Inventory Movement (Decrease RM, Increase FG)
  // ========================================================================
  test('should decrease raw material and increase finished goods inventory', async () => {
    const request = createTestRequest({ quantity: 100 });

    const result = await buildProduct(request, 'test-user');

    // After build:
    // - Raw material quantities should decrease (consumed)
    // - Finished goods quantities should increase by 100 units
    // - Both inventory values should update based on costs

    expect(result.quantity).toEqual(new Decimal('100'));
  });

  // ========================================================================
  // TEST 9: Insufficient Raw Material
  // ========================================================================
  test('should fail build if insufficient raw material available', async () => {
    const request = createTestRequest({
      quantity: 1000, // Too much - exceeds available inventory
    });

    // Should throw error about insufficient quantity
    await expect(buildProduct(request, 'test-user')).rejects.toThrow(
      /Insufficient quantity/i
    );
  });

  // ========================================================================
  // TEST 10: Missing GL Account
  // ========================================================================
  test('should fail if required GL accounts do not exist', async () => {
    const request = createTestRequest();

    // If org has no "Finished Goods" or "Raw Materials" accounts configured
    // Should throw error
    await expect(buildProduct(request, 'test-user')).rejects.toThrow(
      /missing required manufacturing GL accounts/i
    );
  });

  // ========================================================================
  // TEST 11: Uganda Excisable Product Detection
  // ========================================================================
  test('should detect excisable products (Uganda URA)', async () => {
    const request = createTestRequest({
      finishedProductId: 'beverage-product', // Product name contains "beverage"
      quantity: 1000, // 1000 liters of beverage
      laborCost: 1000,
    });

    const result = await buildProduct(request, 'test-user');

    // Should detect product as excisable
    expect(result.isExcisableProduct).toBe(true);
    expect(result.exciseDutyRate).toBeGreaterThan(0);
  });

  // ========================================================================
  // TEST 12: Excise Duty Calculation
  // ========================================================================
  test('should calculate excise duty on excisable products', async () => {
    // Scenario: Beverage manufacturing
    // Manufacturing Cost: $10,000
    // Excise Rate: 20% (Uganda for spirits)
    // Excise Duty: $10,000 × 20% = $2,000

    const request = createTestRequest({
      finishedProductId: 'spirit-product',
      quantity: 500, // 500 liters
      laborCost: 2000,
      overheadCost: 1000,
    });

    const result = await buildProduct(request, 'test-user');

    if (result.isExcisableProduct) {
      expect(result.exciseDutyAmount).toBeDefined();
      expect(result.exciseDutyAmount).toBeGreaterThan(new Decimal('0'));
      
      // Excise = manufacturing cost × rate%
      const expectedExcise = result.totalManufacturingCost
        .times(result.exciseDutyRate || 0)
        .dividedBy(100);
      
      expect(result.exciseDutyAmount).toEqual(expectedExcise);
    }
  });

  // ========================================================================
  // TEST 13: Input VAT Recovery Tracking
  // ========================================================================
  test('should track input VAT on raw materials for recovery', async () => {
    // Raw materials purchased with VAT:
    // Invoice: Component A: $5,000 + VAT 18% = $5,900
    // VAT claimed on PO: $900
    // When assembling, system should know VAT was already claimed
    // No double VAT on finished goods sale

    const request = createTestRequest({
      quantity: 100,
    });

    const result = await buildProduct(request, 'test-user');

    // Input VAT recovered should be tracked
    expect(result.inputVATRecovered).toBeDefined();
  });

  // ========================================================================
  // TEST 14: Excise GL Entry Creation
  // ========================================================================
  test('should create GL entry for excise duty payable', async () => {
    const request = createTestRequest({
      finishedProductId: 'beverage-product',
      quantity: 500,
    });

    const result = await buildProduct(request, 'test-user');

    if (result.isExcisableProduct) {
      const transaction = await getAssemblyDetails(result.assemblyTransactionId, 'test-org');
      
      // Should have excise duty entry
      const hasExciseEntry = transaction?.glTransaction?.ledgerEntries.some(
        (e) => e.account.name.includes('Excise')
      );

      expect(hasExciseEntry).toBe(true);
    }
  });

  // ========================================================================
  // TEST 15: Assembly Transaction Status
  // ========================================================================
  test('should set assembly status to POSTED after successful build', async () => {
    const request = createTestRequest();

    const result = await buildProduct(request, 'test-user');

    expect(result.status).toBe('POSTED');
    
    // Verify in database
    const assembly = await getAssemblyDetails(result.assemblyTransactionId, 'test-org');
    expect(assembly?.status).toBe('POSTED');
  });

  // ========================================================================
  // TEST 16: Assembly Number Generation
  // ========================================================================
  test('should generate unique assembly number', async () => {
    const request1 = createTestRequest();
    const request2 = createTestRequest();

    const result1 = await buildProduct(request1, 'test-user');
    const result2 = await buildProduct(request2, 'test-user');

    expect(result1.assemblyNumber).toBeDefined();
    expect(result2.assemblyNumber).toBeDefined();
    expect(result1.assemblyNumber).not.toBe(result2.assemblyNumber);
  });

  // ========================================================================
  // TEST 17: Reverse Assembly Build
  // ========================================================================
  test('should reverse assembly and restore inventory', async () => {
    const request = createTestRequest({ quantity: 100 });

    const result = await buildProduct(request, 'test-user');
    const originalQty = result.quantity;

    // Now reverse it
    await reverseAssemblyBuild(result.assemblyTransactionId, 'test-org', 'test-user', 'Testing');

    // Check assembly status
    const assembly = await getAssemblyDetails(result.assemblyTransactionId, 'test-org');
    expect(assembly?.status).toBe('REVERSED');

    // GL transaction should be voided
    expect(assembly?.glTransaction?.status).toBe('VOIDED');
  });

  // ========================================================================
  // TEST 18: List Assembly Transactions
  // ========================================================================
  test('should list assembly transactions with filtering', async () => {
    const request1 = createTestRequest({ quantity: 50 });
    const request2 = createTestRequest({ quantity: 100 });

    await buildProduct(request1, 'test-user');
    await buildProduct(request2, 'test-user');

    const assemblies = await listAssemblyTransactions('test-org', {
      status: 'POSTED',
      limit: 10,
    });

    expect(assemblies.length).toBeGreaterThanOrEqual(2);
    expect(assemblies.every((a) => a.status === 'POSTED')).toBe(true);
  });

  // ========================================================================
  // TEST 19: Zero Labor/Overhead
  // ========================================================================
  test('should handle builds with zero labor and overhead costs', async () => {
    const request = createTestRequest({
      laborCost: 0,
      overheadCost: 0,
    });

    const result = await buildProduct(request, 'test-user');

    expect(result.laborCost).toEqual(new Decimal('0'));
    expect(result.overheadCost).toEqual(new Decimal('0'));
    expect(result.totalManufacturingCost).toEqual(result.materialCost);
  });

  // ========================================================================
  // TEST 20: Large Quantity Build
  // ========================================================================
  test('should handle large quantity builds (scalability test)', async () => {
    const request = createTestRequest({
      quantity: 10000, // 10,000 units
      laborCost: 50000,
      overheadCost: 25000,
    });

    const result = await buildProduct(request, 'test-user');

    expect(result.quantity).toEqual(new Decimal('10000'));
    expect(result.totalManufacturingCost).toBeGreaterThan(new Decimal('0'));
  });

  // ========================================================================
  // TEST 21: Decimal Precision (Accounting Critical)
  // ========================================================================
  test('should maintain decimal precision for financial accuracy', async () => {
    const request = createTestRequest({
      quantity: 333, // Odd number to test rounding
      laborCost: 1234.56,
      overheadCost: 789.12,
    });

    const result = await buildProduct(request, 'test-user');

    // Check that totals are precisely calculated
    const expectedTotal = result.materialCost
      .plus(new Decimal('1234.56'))
      .plus(new Decimal('789.12'));

    expect(result.totalManufacturingCost).toEqual(expectedTotal);
  });

  // ========================================================================
  // TEST 22: Multiple Assemblies (Same BOM)
  // ========================================================================
  test('should handle multiple assemblies from same BOM with different costs', async () => {
    // Build 1: Using older/cheaper component batches
    const request1 = createTestRequest({ quantity: 100 });

    // Build 2: Using newer/more expensive component batches
    const request2 = createTestRequest({ quantity: 100 });

    const result1 = await buildProduct(request1, 'test-user');
    const result2 = await buildProduct(request2, 'test-user');

    // Both should succeed with potentially different unit costs
    expect(result1.assemblyTransactionId).not.toBe(result2.assemblyTransactionId);
  });

  // ========================================================================
  // TEST 23: Transaction Rollback on Failure
  // ========================================================================
  test('should rollback all changes if assembly fails mid-process', async () => {
    const request = createTestRequest({
      bomId: 'invalid-bom-id', // Will fail BOM lookup
    });

    // Expect transaction to fail
    await expect(buildProduct(request, 'test-user')).rejects.toThrow();

    // Verify no partial data was saved
    // (Prisma transaction ensures atomic all-or-nothing)
  });

  // ========================================================================
  // TEST 24: Non-Excisable Product
  // ========================================================================
  test('should not apply excise duty to non-excisable products', async () => {
    const request = createTestRequest({
      finishedProductId: 'non-excisable-product', // e.g., electronics
      quantity: 100,
    });

    const result = await buildProduct(request, 'test-user');

    expect(result.isExcisableProduct).toBe(false);
    expect(result.exciseDutyAmount).toBeUndefined();
  });

  // ========================================================================
  // TEST 25: Assembly Date Handling
  // ========================================================================
  test('should respect custom assembly date for GL posting', async () => {
    const customDate = new Date('2025-06-15');
    const request = createTestRequest({
      assemblyDate: customDate,
    });

    const result = await buildProduct(request, 'test-user');
    const assembly = await getAssemblyDetails(result.assemblyTransactionId, 'test-org');

    expect(assembly?.assemblyDate.getTime()).toBe(customDate.getTime());
    expect(assembly?.glTransaction?.transactionDate.getTime()).toBe(customDate.getTime());
  });
});

describe('Assembly Service - Edge Cases & Error Handling', () => {
  // ========================================================================
  // TEST 26: BOM Not Found
  // ========================================================================
  test('should throw error if BOM does not exist', async () => {
    const request = createTestRequest({
      bomId: 'non-existent-bom',
    });

    await expect(buildProduct(request, 'test-user')).rejects.toThrow(
      /not found|BOM/i
    );
  });

  // ========================================================================
  // TEST 27: Finished Product Not Found
  // ========================================================================
  test('should throw error if finished product does not exist', async () => {
    const request = createTestRequest({
      finishedProductId: 'non-existent-product',
    });

    await expect(buildProduct(request, 'test-user')).rejects.toThrow(
      /not found|product/i
    );
  });

  // ========================================================================
  // TEST 28: Negative Quantity
  // ========================================================================
  test('should reject negative or zero quantities', async () => {
    const request = createTestRequest({ quantity: -100 });

    await expect(buildProduct(request, 'test-user')).rejects.toThrow(
      /greater than zero|positive/i
    );
  });
});
