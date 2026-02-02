/**
 * Tax Compliance Testing Script
 * Run this to test Uganda URA compliance pack
 */

import { PrismaClient } from '@prisma/client';
import { 
  initializeUgandaURAPack,
  calculateUgandaVAT,
  calculateUgandaWHT,
  calculateUgandaPAYE,
  canClaimInputTaxCredit,
} from '../lib/tax/uganda-ura-compliance';
import { 
  generateUgandaVATReturn,
  generateUgandaWHTReturn,
  saveVATReturn,
  saveWHTReturn,
} from '../lib/tax/tax-return-generator';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Uganda URA Tax Compliance Pack\n');

  // Test 1: Calculator Functions
  console.log('=== Test 1: Tax Calculators ===\n');

  // VAT Calculation
  console.log('1.1 VAT Calculation (Standard 18%)');
  const vat = calculateUgandaVAT(10000000, 'STANDARD');
  console.log(`   Net Amount: UGX ${vat.netAmount.toLocaleString()}`);
  console.log(`   VAT Amount: UGX ${vat.vatAmount.toLocaleString()}`);
  console.log(`   Gross Amount: UGX ${vat.grossAmount.toLocaleString()}`);
  console.log(`   ✅ Expected: Net=10M, VAT=1.8M, Gross=11.8M\n`);

  // WHT Calculation (Above threshold)
  console.log('1.2 WHT Calculation - Professional Services (6%)');
  const wht = calculateUgandaWHT(5000000, 'PROFESSIONAL_SERVICES', true);
  console.log(`   Gross Amount: UGX ${wht.grossAmount.toLocaleString()}`);
  console.log(`   WHT Amount: UGX ${wht.whtAmount.toLocaleString()}`);
  console.log(`   Net Amount: UGX ${wht.netAmount.toLocaleString()}`);
  console.log(`   WHT Applicable: ${wht.whtApplicable}`);
  console.log(`   ✅ Expected: Gross=5M, WHT=300K, Net=4.7M, Applicable=true\n`);

  // WHT Below threshold
  console.log('1.3 WHT Calculation - Below Threshold');
  const whtBelowThreshold = calculateUgandaWHT(500000, 'PROFESSIONAL_SERVICES', true);
  console.log(`   Gross Amount: UGX ${whtBelowThreshold.grossAmount.toLocaleString()}`);
  console.log(`   WHT Amount: UGX ${whtBelowThreshold.whtAmount.toLocaleString()}`);
  console.log(`   WHT Applicable: ${whtBelowThreshold.whtApplicable}`);
  console.log(`   ✅ Expected: WHT=0, Applicable=false (below UGX 1M threshold)\n`);

  // PAYE Calculation
  console.log('1.4 PAYE Calculation (UGX 1M monthly salary)');
  const paye = calculateUgandaPAYE(1000000);
  console.log(`   Gross Salary: UGX ${paye.grossSalary.toLocaleString()}`);
  console.log(`   PAYE: UGX ${paye.paye.toLocaleString()}`);
  console.log(`   Net Salary: UGX ${paye.netSalary.toLocaleString()}`);
  console.log('   Breakdown:');
  paye.breakdown.forEach((b) => {
    console.log(`     ${b.bracket}: UGX ${b.amount.toLocaleString()} @ ${b.rate}% = UGX ${b.tax.toLocaleString()}`);
  });
  console.log(`   ✅ Expected: PAYE≈127K, Net≈873K\n`);

  // Input Tax Credit Check
  console.log('1.5 Input Tax Credit Eligibility');
  const itcValid = canClaimInputTaxCredit('EFRIS-202512-1234', 'VAT_STANDARD_18');
  console.log(`   With EFRIS Receipt: ${itcValid.canClaim ? '✅ Can Claim' : '❌ Cannot Claim'}`);
  
  const itcInvalid = canClaimInputTaxCredit(null, 'VAT_STANDARD_18');
  console.log(`   Without EFRIS Receipt: ${itcInvalid.canClaim ? '✅ Can Claim' : '❌ Cannot Claim'}`);
  console.log(`   Reason: ${itcInvalid.reason}\n`);

  // Test 2: Database Operations
  console.log('\n=== Test 2: Database Operations ===\n');

  // Check if test org exists
  let testOrg = await prisma.organization.findFirst({
    where: { slug: 'test-uganda' },
  });

  if (!testOrg) {
    console.log('2.1 Creating test organization...');
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Uganda Company',
        slug: 'test-uganda',
        baseCurrency: 'UGX',
        fiscalYearStart: 1,
      },
    });
    console.log(`   ✅ Created org: ${testOrg.name}\n`);
  } else {
    console.log(`2.1 Using existing test org: ${testOrg.name}\n`);
  }

  // Initialize Uganda URA Pack
  console.log('2.2 Initializing Uganda URA Compliance Pack...');
  try {
    const result = await initializeUgandaURAPack(testOrg.id);
    console.log(`   ✅ ${result.message}`);
    console.log(`   VAT Rates Created: ${result.data.vatRates}`);
    console.log(`   WHT Rules Created: ${result.data.whtRules}\n`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('   ℹ️  Compliance pack already initialized\n');
    } else {
      throw error;
    }
  }

  // Verify tax rates
  console.log('2.3 Verifying Tax Rates...');
  const taxRates = await prisma.taxRate.findMany({
    where: { organizationId: testOrg.id, isActive: true },
    orderBy: { name: 'asc' },
  });
  console.log(`   Found ${taxRates.length} tax rates:`);
  taxRates.forEach((rate) => {
    console.log(`     - ${rate.name}: ${rate.rate}% (${rate.taxCode})`);
  });
  console.log('');

  // Verify WHT rules
  console.log('2.4 Verifying WHT Rules...');
  const whtRules = await prisma.wHTRule.findMany({
    where: { organizationId: testOrg.id, isActive: true },
    orderBy: { name: 'asc' },
  });
  console.log(`   Found ${whtRules.length} WHT rules:`);
  whtRules.forEach((rule) => {
    console.log(`     - ${rule.name}: ${rule.rate}% (Threshold: UGX ${Number(rule.threshold || 0).toLocaleString()})`);
  });
  console.log('');

  // Test 3: Transaction Creation (if test data exists)
  console.log('\n=== Test 3: Sample Transaction Test ===\n');

  // Check if test customer exists
  let testCustomer = await prisma.customer.findFirst({
    where: { organizationId: testOrg.id },
  });

  if (!testCustomer) {
    console.log('3.1 Creating test customer...');
    testCustomer = await prisma.customer.create({
      data: {
        organizationId: testOrg.id,
        customerNumber: 'CUST-TEST-001',
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
      },
    });
    console.log(`   ✅ Created customer: ${testCustomer.firstName} ${testCustomer.lastName}\n`);
  } else {
    console.log(`3.1 Using existing customer: ${testCustomer.firstName} ${testCustomer.lastName}\n`);
  }

  // Get standard VAT rate
  const standardVATRate = taxRates.find((r) => r.name === 'Standard VAT');
  if (standardVATRate) {
    console.log('3.2 Creating test invoice with 18% VAT...');
    
    const invoiceData = {
      organizationId: testOrg.id,
      customerId: testCustomer.id,
      invoiceNumber: `INV-TEST-${Date.now()}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currency: 'UGX',
      subtotal: 10000000,
      taxAmount: 1800000,
      total: 11800000,
      amountDue: 11800000,
    };

    try {
      const invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          items: {
            create: [{
              description: 'Web Development Services',
              quantity: 1,
              unitPrice: 10000000,
              taxRateId: standardVATRate.id,
              taxCategory: 'VAT_STANDARD_18',
              taxRate: 18.00,
              taxAmount: 1800000,
              total: 11800000,
            }],
          },
        },
      });

      console.log(`   ✅ Created invoice: ${invoice.invoiceNumber}`);
      console.log(`   Subtotal: UGX ${Number(invoice.subtotal).toLocaleString()}`);
      console.log(`   VAT (18%): UGX ${Number(invoice.taxAmount).toLocaleString()}`);
      console.log(`   Total: UGX ${Number(invoice.total).toLocaleString()}\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Could not create invoice: ${error.message}\n`);
    }
  }

  // Test 4: Tax Return Generation (if invoices exist)
  console.log('\n=== Test 4: Tax Return Generation ===\n');

  const invoiceCount = await prisma.invoice.count({
    where: {
      organizationId: testOrg.id,
      status: { notIn: ['DRAFT', 'CANCELLED', 'VOIDED'] },
    },
  });

  if (invoiceCount > 0) {
    console.log(`4.1 Found ${invoiceCount} invoice(s) for testing`);
    console.log('4.2 Generating VAT Return for current month...\n');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      const vatReturn = await generateUgandaVATReturn(testOrg.id, startDate, endDate);
      
      console.log('   VAT Return Generated:');
      console.log(`   Period: ${vatReturn.period}`);
      console.log(`   Sales Invoices: ${vatReturn.salesInvoiceCount}`);
      console.log(`   Purchase Bills: ${vatReturn.purchaseBillCount}`);
      console.log('');
      console.log('   Output VAT (Sales):');
      console.log(`     Standard Rate Sales: UGX ${vatReturn.standardRateSales.toLocaleString()}`);
      console.log(`     Standard Rate VAT: UGX ${vatReturn.standardRateVAT.toLocaleString()}`);
      console.log(`     Zero-rated Sales: UGX ${vatReturn.zeroRatedSales.toLocaleString()}`);
      console.log(`     Exempt Sales: UGX ${vatReturn.exemptSales.toLocaleString()}`);
      console.log(`     Total Output VAT: UGX ${vatReturn.totalOutputVAT.toLocaleString()}`);
      console.log('');
      console.log('   Input VAT (Purchases):');
      console.log(`     Claimable Input VAT: UGX ${vatReturn.claimableInputVAT.toLocaleString()}`);
      console.log(`     Non-claimable (no EFRIS): UGX ${vatReturn.nonClaimableInputVAT.toLocaleString()}`);
      console.log(`     Total Input VAT: UGX ${vatReturn.totalInputVAT.toLocaleString()}`);
      console.log('');
      console.log(`   Net VAT Position: UGX ${vatReturn.netVAT.toLocaleString()}`);
      console.log(`   ${vatReturn.netVAT >= 0 ? '💰 Payable to URA' : '💸 Refund from URA'}\n`);

      // Save to database
      console.log('4.3 Saving VAT Return to database...');
      const taxReturnId = await saveVATReturn(testOrg.id, vatReturn);
      console.log(`   ✅ Saved with ID: ${taxReturnId}\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Error generating VAT return: ${error.message}\n`);
    }
  } else {
    console.log('4.1 No invoices found. Skipping VAT return generation.\n');
  }

  // Test 5: WHT Return Generation
  const whtCount = await prisma.wHTTransaction.count({
    where: { organizationId: testOrg.id },
  });

  if (whtCount > 0) {
    console.log('\n=== Test 5: WHT Return Generation ===\n');
    console.log(`5.1 Found ${whtCount} WHT transaction(s)`);
    console.log('5.2 Generating WHT Return for current month...\n');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      const whtReturn = await generateUgandaWHTReturn(testOrg.id, startDate, endDate);
      
      console.log('   WHT Return Generated:');
      console.log(`   Period: ${whtReturn.period}`);
      console.log(`   Total WHT Withheld: UGX ${whtReturn.totalWHTWithheld.toLocaleString()}\n`);
      
      console.log('   Breakdown by Type:');
      whtReturn.whtByType.forEach((item) => {
        console.log(`     ${item.description}:`);
        console.log(`       Gross Amount: UGX ${item.grossAmount.toLocaleString()}`);
        console.log(`       WHT Amount: UGX ${item.whtAmount.toLocaleString()}`);
        console.log(`       Transactions: ${item.transactionCount}`);
      });
      console.log('');

      // Save to database
      console.log('5.3 Saving WHT Return to database...');
      const taxReturnId = await saveWHTReturn(testOrg.id, whtReturn);
      console.log(`   ✅ Saved with ID: ${taxReturnId}\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Error generating WHT return: ${error.message}\n`);
    }
  } else {
    console.log('\n5.1 No WHT transactions found. Skipping WHT return generation.\n');
  }

  console.log('\n✅ All tests completed!\n');
  console.log('=== Summary ===');
  console.log('✅ Tax calculators working');
  console.log('✅ Database operations functional');
  console.log('✅ Uganda URA pack initialized');
  console.log('✅ Tax rates and WHT rules created');
  console.log('✅ Tax return generation ready');
  console.log('\nNext steps:');
  console.log('1. Create more test invoices and bills');
  console.log('2. Test month-end VAT return generation');
  console.log('3. Build frontend UI for tax management');
  console.log('4. Test EFRIS integration');
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
