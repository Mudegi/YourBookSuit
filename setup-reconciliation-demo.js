/**
 * Setup Bank Reconciliation Demo Data
 * Run this with: node setup-reconciliation-demo.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDemoData() {
  try {
    console.log('🚀 Setting up Bank Reconciliation demo data...\n');

    // 1. Get organization and user
    const organization = await prisma.organization.findFirst();
    const user = await prisma.user.findFirst();

    if (!organization || !user) {
      console.error('❌ No organization or user found. Please run seed first.');
      return;
    }

    console.log(`✅ Found organization: ${organization.name}`);
    console.log(`✅ Found user: ${user.email}\n`);

    // 2. Get or create GL Bank Account
    let glBankAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId: organization.id,
        accountType: 'ASSET',
        accountName: { contains: 'Bank', mode: 'insensitive' },
      },
    });

    if (!glBankAccount) {
      console.log('Creating GL Bank Account...');
      glBankAccount = await prisma.chartOfAccount.create({
        data: {
          organizationId: organization.id,
          accountCode: '1010',
          accountName: 'Bank - Current Account',
          accountType: 'ASSET',
          subType: 'CURRENT_ASSET',
          currency: organization.baseCurrency,
          isActive: true,
        },
      });
    }

    console.log(`✅ GL Bank Account: ${glBankAccount.accountName}\n`);

    // 3. Get an expense account
    let expenseAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId: organization.id,
        accountType: 'EXPENSE',
      },
    });

    if (!expenseAccount) {
      console.log('Creating Bank Charges Account...');
      expenseAccount = await prisma.chartOfAccount.create({
        data: {
          organizationId: organization.id,
          accountCode: '6100',
          accountName: 'Bank Charges',
          accountType: 'EXPENSE',
          subType: 'OPERATING_EXPENSE',
          currency: organization.baseCurrency,
          isActive: true,
        },
      });
    }

    console.log(`✅ Expense Account: ${expenseAccount.accountName}\n`);

    // 4. Create Bank Account
    console.log('Creating Bank Account...');
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: organization.id,
        accountName: 'Stanbic Business Account',
        accountNumber: '1234567890',
        bankName: 'Stanbic Bank Uganda',
        currency: organization.baseCurrency,
        currentBalance: 5000000.00,
        isActive: true,
        glAccountId: glBankAccount.id,
      },
    });

    console.log(`✅ Bank Account created: ${bankAccount.accountName}\n`);

    // 5. Create Payments (Book entries)
    console.log('Creating sample payments...');
    
    const payment1 = await prisma.payment.create({
      data: {
        organizationId: organization.id,
        paymentNumber: 'PAY-2026-001',
        paymentDate: new Date('2026-01-28'),
        paymentType: 'CUSTOMER_PAYMENT',
        amount: 500000.00,
        currency: organization.baseCurrency,
        paymentMethod: 'BANK_TRANSFER',
        bankAccountId: bankAccount.id,
        notes: 'Payment from Customer A - Invoice #001',
        isReconciled: false,
      },
    });

    const payment2 = await prisma.payment.create({
      data: {
        organizationId: organization.id,
        paymentNumber: 'PAY-2026-002',
        paymentDate: new Date('2026-01-29'),
        paymentType: 'CUSTOMER_PAYMENT',
        amount: 750000.00,
        currency: organization.baseCurrency,
        paymentMethod: 'BANK_TRANSFER',
        bankAccountId: bankAccount.id,
        notes: 'Payment from Customer B - Invoice #002',
        isReconciled: false,
      },
    });

    const payment3 = await prisma.payment.create({
      data: {
        organizationId: organization.id,
        paymentNumber: 'PAY-2026-003',
        paymentDate: new Date('2026-01-30'),
        paymentType: 'VENDOR_PAYMENT',
        amount: 300000.00,
        currency: organization.baseCurrency,
        paymentMethod: 'CHECK',
        bankAccountId: bankAccount.id,
        referenceNumber: 'CHK-12345',
        notes: 'Payment to Vendor X for supplies',
        isReconciled: false,
      },
    });

    console.log(`✅ Created ${payment1.paymentNumber}: UGX 500,000`);
    console.log(`✅ Created ${payment2.paymentNumber}: UGX 750,000`);
    console.log(`✅ Created ${payment3.paymentNumber}: UGX 300,000\n`);

    // 6. Create Bank Feed
    console.log('Creating Bank Feed...');
    const bankFeed = await prisma.bankFeed.create({
      data: {
        organizationId: organization.id,
        bankAccountId: bankAccount.id,
        feedName: 'January 2026 Statement',
        feedType: 'CSV_UPLOAD',
        status: 'COMPLETED',
      },
    });

    console.log(`✅ Bank Feed created: ${bankFeed.feedName}\n`);

    // 7. Create Bank Transactions (from statement)
    console.log('Creating bank transactions (from statement)...');

    await prisma.bankTransaction.createMany({
      data: [
        {
          organizationId: organization.id,
          bankFeedId: bankFeed.id,
          transactionDate: new Date('2026-01-28'),
          amount: 500000.00,
          description: 'CREDIT - Customer Deposit A',
          transactionType: 'CREDIT',
          status: 'PENDING',
          isReconciled: false,
        },
        {
          organizationId: organization.id,
          bankFeedId: bankFeed.id,
          transactionDate: new Date('2026-01-29'),
          amount: 750000.00,
          description: 'CREDIT - Wire Transfer In',
          transactionType: 'CREDIT',
          status: 'PENDING',
          isReconciled: false,
        },
        {
          organizationId: organization.id,
          bankFeedId: bankFeed.id,
          transactionDate: new Date('2026-01-30'),
          amount: -300000.00,
          description: 'DEBIT - Check CHK-12345',
          referenceNo: 'CHK-12345',
          transactionType: 'DEBIT',
          status: 'PENDING',
          isReconciled: false,
        },
        {
          organizationId: organization.id,
          bankFeedId: bankFeed.id,
          transactionDate: new Date('2026-01-31'),
          amount: -15000.00,
          description: 'DEBIT - Monthly Account Maintenance Fee',
          transactionType: 'DEBIT',
          status: 'PENDING',
          isReconciled: false,
        },
      ],
    });

    console.log('✅ Created 4 bank transactions\n');

    console.log('=' .repeat(60));
    console.log('🎉 Demo data setup complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Bank Account: ${bankAccount.accountName}`);
    console.log(`   - Starting Balance: UGX 5,000,000`);
    console.log(`   - Book Entries: 3 payments (2 in, 1 out)`);
    console.log(`   - Bank Transactions: 4 (3 matched, 1 fee)\n`);
    console.log('🚀 Next Steps:');
    console.log(`   1. Go to: http://localhost:3000/${organization.slug}/banking/reconciliation`);
    console.log(`   2. Select: "Stanbic Business Account"`);
    console.log(`   3. Statement Date: 2026-01-31`);
    console.log(`   4. Statement Balance: 4,935,000 (5M + 1.25M - 300K - 15K)`);
    console.log(`   5. Click "Start Reconciliation"`);
    console.log(`   6. Use "Auto-Match" to match the 3 payments`);
    console.log(`   7. Use "Quick Adjust" for the 15K bank fee`);
    console.log(`   8. Click "Finalize & Lock" when difference = 0\n`);
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDemoData();
