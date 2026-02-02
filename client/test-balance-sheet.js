const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FinancialReportsService = require('./services/reports/financial-reports.service').default;

async function testBalanceSheet() {
  try {
    const organizationId = 'cmkr0wbeq0001vl95dodsfurp';
    const asOfDate = new Date('2026-02-02');
    const fiscalYearStart = new Date('2025-01-01');

    console.log('=== TESTING BALANCE SHEET SERVICE ===\n');
    
    const report = await FinancialReportsService.generateBalanceSheet(
      organizationId,
      asOfDate,
      'ACCRUAL',
      fiscalYearStart
    );

    console.log('Assets:');
    console.log(`  Current Assets: $${report.assets.currentAssets.subtotal}`);
    console.log(`    Accounts (${report.assets.currentAssets.accounts.length}):`);
    report.assets.currentAssets.accounts.forEach(a => {
      console.log(`      ${a.accountCode} - ${a.accountName}: $${a.balance}`);
    });
    console.log(`  Fixed Assets: $${report.assets.fixedAssets.subtotal}`);
    console.log(`    Accounts (${report.assets.fixedAssets.accounts.length}):`);
    report.assets.fixedAssets.accounts.forEach(a => {
      console.log(`      ${a.accountCode} - ${a.accountName}: $${a.balance}`);
    });
    console.log(`  Other Assets: $${report.assets.otherAssets.subtotal}`);
    console.log(`  TOTAL ASSETS: $${report.assets.totalAssets}\n`);

    console.log('Liabilities:');
    console.log(`  Current Liabilities: $${report.liabilities.currentLiabilities.subtotal}`);
    console.log(`  Long-term Liabilities: $${report.liabilities.longTermLiabilities.subtotal}`);
    console.log(`  TOTAL LIABILITIES: $${report.liabilities.totalLiabilities}\n`);

    console.log('Equity:');
    console.log(`  Owner's Capital: $${report.equity.retainedEarnings}`);
    console.log(`  Retained Earnings: $${report.equity.retainedEarnings}`);
    console.log(`  Current Year Earnings: $${report.equity.currentYearEarnings}`);
    console.log(`  Other Equity: $${report.equity.otherEquity.subtotal}`);
    console.log(`    Accounts (${report.equity.otherEquity.accounts.length}):`);
    report.equity.otherEquity.accounts.forEach(a => {
      console.log(`      ${a.accountCode} - ${a.accountName}: $${a.balance}`);
    });
    console.log(`  TOTAL EQUITY: $${report.equity.totalEquity}\n`);

    console.log('Totals:');
    console.log(`  Total Assets: $${report.assets.totalAssets}`);
    console.log(`  Total Liabilities & Equity: $${report.totalLiabilitiesAndEquity}`);
    console.log(`  Difference: $${report.assets.totalAssets.minus(report.totalLiabilitiesAndEquity)}`);
    
    const balanced = report.assets.totalAssets.equals(report.totalLiabilitiesAndEquity);
    console.log(`  ${balanced ? '✅ BALANCED!' : '❌ OUT OF BALANCE'}`);

  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testBalanceSheet();
