const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleVATData() {
  try {
    console.log('🚀 Creating sample VAT data...\n');

    // Get organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.error('❌ No organization found');
      return;
    }
    console.log(`✅ Organization: ${org.name} (${org.slug})`);

    // Create or get a customer
    let customer = await prisma.customer.findFirst({
      where: { organizationId: org.id }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId: org.id,
          companyName: 'ABC Retail Ltd',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@abcretail.com',
          phone: '+256700123456',
          customerType: 'BUSINESS',
          tinNumber: '1000123456',
          status: 'ACTIVE',
        }
      });
      console.log(`✅ Created customer: ${customer.companyName}`);
    } else {
      console.log(`✅ Using existing customer: ${customer.companyName || customer.firstName + ' ' + customer.lastName}`);
    }

    // Create or get a vendor
    let vendor = await prisma.vendor.findFirst({
      where: { organizationId: org.id }
    });

    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          organizationId: org.id,
          companyName: 'XYZ Suppliers Ltd',
          contactPerson: 'Jane Smith',
          email: 'jane@xyzsuppliers.com',
          phone: '+256700654321',
          tinNumber: '1000654321',
          status: 'ACTIVE',
        }
      });
      console.log(`✅ Created vendor: ${vendor.companyName}`);
    } else {
      console.log(`✅ Using existing vendor: ${vendor.companyName}`);
    }

    // Get revenue and expense accounts
    const revenueAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId: org.id,
        accountType: 'REVENUE'
      }
    });

    const expenseAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId: org.id,
        accountType: 'EXPENSE'
      }
    });

    if (!revenueAccount || !expenseAccount) {
      console.error('❌ Required accounts not found. Please run COA generation first.');
      return;
    }

    console.log(`✅ Revenue Account: ${revenueAccount.code} - ${revenueAccount.name}`);
    console.log(`✅ Expense Account: ${expenseAccount.code} - ${expenseAccount.name}`);

    // Create sample sales invoice (January 2026)
    const invoiceDate = new Date('2026-01-15');
    const dueDate = new Date('2026-02-15');

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        customerId: customer.id,
        invoiceNumber: `INV-${Date.now()}`,
        invoiceDate,
        dueDate,
        currency: org.baseCurrency,
        exchangeRate: 1,
        subtotal: 1000000, // 1,000,000 UGX
        taxAmount: 180000,  // 18% VAT = 180,000 UGX
        total: 1180000,     // Total = 1,180,000 UGX
        amountDue: 1180000,
        status: 'SENT',
        taxCalculationMethod: 'EXCLUSIVE',
        items: {
          create: [
            {
              description: 'Office Furniture - Desks',
              quantity: 10,
              unitPrice: 100000,
              taxRate: 18.00,
              taxAmount: 180000,
              subtotal: 1000000,
              total: 1180000,
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    console.log(`\n✅ Created Sales Invoice: ${invoice.invoiceNumber}`);
    console.log(`   📅 Date: ${invoice.invoiceDate.toLocaleDateString()}`);
    console.log(`   💰 Subtotal: ${invoice.subtotal.toLocaleString()} UGX`);
    console.log(`   🧾 VAT (18%): ${invoice.taxAmount.toLocaleString()} UGX`);
    console.log(`   💵 Total: ${invoice.total.toLocaleString()} UGX`);

    // Create sample purchase bill (January 2026)
    const billDate = new Date('2026-01-10');
    const billDueDate = new Date('2026-02-10');

    const bill = await prisma.bill.create({
      data: {
        organizationId: org.id,
        vendorId: vendor.id,
        billNumber: `BILL-${Date.now()}`,
        billDate,
        dueDate: billDueDate,
        currency: org.baseCurrency,
        exchangeRate: 1,
        subtotal: 500000,  // 500,000 UGX
        taxAmount: 90000,   // 18% VAT = 90,000 UGX
        total: 590000,      // Total = 590,000 UGX
        amountDue: 590000,
        status: 'APPROVED',
        items: {
          create: [
            {
              description: 'Office Supplies Purchase',
              quantity: 1,
              unitPrice: 500000,
              taxRate: 18.00,
              taxAmount: 90000,
              total: 590000,
              accountId: expenseAccount.id,
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    console.log(`\n✅ Created Purchase Bill: ${bill.billNumber}`);
    console.log(`   📅 Date: ${bill.billDate.toLocaleDateString()}`);
    console.log(`   💰 Subtotal: ${bill.subtotal.toLocaleString()} UGX`);
    console.log(`   🧾 VAT (18%): ${bill.taxAmount.toLocaleString()} UGX`);
    console.log(`   💵 Total: ${bill.total.toLocaleString()} UGX`);

    console.log('\n' + '='.repeat(60));
    console.log('📊 VAT RETURN CALCULATION FOR JANUARY 2026');
    console.log('='.repeat(60));
    console.log(`Box 1 - Standard Sales:     ${invoice.subtotal.toLocaleString()} UGX`);
    console.log(`Box 1 - Output VAT:         ${invoice.taxAmount.toLocaleString()} UGX`);
    console.log('');
    console.log(`Box 2 - Zero Rated:         0 UGX`);
    console.log('');
    console.log(`Box 3 - Purchases:          ${bill.subtotal.toLocaleString()} UGX`);
    console.log(`Box 3 - Input VAT:          ${bill.taxAmount.toLocaleString()} UGX`);
    console.log('');
    console.log(`Box 4 - Net Tax Payable:    ${(invoice.taxAmount - bill.taxAmount).toLocaleString()} UGX`);
    console.log('='.repeat(60));

    console.log('\n✅ Sample data created successfully!');
    console.log('\n📍 Next Steps:');
    console.log('1. Go to: http://localhost:3000/demo-company/reports/tax/vat-return');
    console.log('2. Select period: January 2026');
    console.log('3. You should see the data populated in the VAT boxes');
    console.log('4. Click on any box to drill down and see the transactions');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleVATData();
