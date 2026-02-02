/**
 * Database Seed Script
 * Creates initial data for development and testing
 */

import { PrismaClient, AccountType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Create Demo User
  console.log('👤 Creating demo user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`✅ User created: ${user.email}\n`);

  // 2. Create Demo Organization
  console.log('🏢 Creating demo organization...');
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company Inc.',
      slug: 'demo-company',
      taxIdNumber: '12-3456789',
      baseCurrency: 'USD',
      fiscalYearStart: 1, // January
      email: 'info@democompany.com',
      phone: '+1234567890',
      address: '123 Business St, New York, NY 10001',
      isActive: true,
    },
  });
  console.log(`✅ Organization created: ${organization.name}\n`);

  // 3. Link User to Organization
  console.log('🔗 Linking user to organization...');
  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ User linked as ADMIN\n`);

  // 4. Create Chart of Accounts (Standard Accounting Structure)
  console.log('📊 Creating Chart of Accounts...\n');

  const accounts = [
    // ASSETS (1000-1999)
    { code: '1000', name: 'Cash on Hand', type: AccountType.ASSET, subType: 'Current Assets' },
    { code: '1100', name: 'Checking Account', type: AccountType.ASSET, subType: 'Current Assets' },
    { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, subType: 'Current Assets' },
    { code: '1300', name: 'Inventory', type: AccountType.ASSET, subType: 'Current Assets' },
    { code: '1400', name: 'Prepaid Expenses', type: AccountType.ASSET, subType: 'Current Assets' },
    { code: '1500', name: 'Property, Plant & Equipment', type: AccountType.ASSET, subType: 'Fixed Assets' },
    { code: '1510', name: 'Accumulated Depreciation', type: AccountType.ASSET, subType: 'Fixed Assets' },
    { code: '1600', name: 'Intangible Assets', type: AccountType.ASSET, subType: 'Fixed Assets' },

    // LIABILITIES (2000-2999)
    { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, subType: 'Current Liabilities' },
    { code: '2100', name: 'Tax Payable', type: AccountType.LIABILITY, subType: 'Current Liabilities' },
    { code: '2200', name: 'Accrued Expenses', type: AccountType.LIABILITY, subType: 'Current Liabilities' },
    { code: '2300', name: 'Short-term Loans', type: AccountType.LIABILITY, subType: 'Current Liabilities' },
    { code: '2500', name: 'Long-term Debt', type: AccountType.LIABILITY, subType: 'Long-term Liabilities' },

    // EQUITY (3000-3999)
    { code: '3000', name: 'Owner\'s Capital', type: AccountType.EQUITY, subType: 'Equity' },
    { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, subType: 'Equity' },
    { code: '3200', name: 'Owner\'s Draw', type: AccountType.EQUITY, subType: 'Equity' },

    // REVENUE (4000-4999)
    { code: '4000', name: 'Sales Revenue', type: AccountType.REVENUE, subType: 'Operating Revenue' },
    { code: '4100', name: 'Service Revenue', type: AccountType.REVENUE, subType: 'Operating Revenue' },
    { code: '4200', name: 'Interest Income', type: AccountType.REVENUE, subType: 'Other Revenue' },
    { code: '4300', name: 'Other Income', type: AccountType.REVENUE, subType: 'Other Revenue' },

    // COST OF SALES (5000-5999)
    { code: '5000', name: 'Cost of Goods Sold', type: AccountType.COST_OF_SALES, subType: 'Direct Costs' },
    { code: '5100', name: 'Purchase Discounts', type: AccountType.COST_OF_SALES, subType: 'Direct Costs' },

    // EXPENSES (6000-9999)
    { code: '6000', name: 'Salaries & Wages', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6100', name: 'Rent Expense', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6200', name: 'Utilities Expense', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6300', name: 'Office Supplies', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6400', name: 'Insurance Expense', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6500', name: 'Depreciation Expense', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6600', name: 'Marketing & Advertising', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6700', name: 'Professional Fees', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6800', name: 'Travel & Entertainment', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '6900', name: 'Bank Fees', type: AccountType.EXPENSE, subType: 'Operating Expenses' },
    { code: '7000', name: 'Interest Expense', type: AccountType.EXPENSE, subType: 'Financial Expenses' },
    { code: '7100', name: 'Tax Expense', type: AccountType.EXPENSE, subType: 'Financial Expenses' },
    { code: '9000', name: 'Miscellaneous Expense', type: AccountType.EXPENSE, subType: 'Other Expenses' },
  ];

  for (const account of accounts) {
    await prisma.chartOfAccount.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: account.code,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: account.code,
        name: account.name,
        accountType: account.type,
        accountSubType: account.subType,
        isActive: true,
        isSystem: true, // Mark as system account (can't be deleted)
        balance: 0,
      },
    });
    console.log(`  ✓ ${account.code} - ${account.name}`);
  }
  console.log(`\n✅ Chart of Accounts created\n`);

  // 5. Create Fiscal Period
  console.log('📅 Creating fiscal period...');
  const currentYear = new Date().getFullYear();
  await prisma.fiscalPeriod.upsert({
    where: {
      organizationId_startDate_endDate: {
        organizationId: organization.id,
        startDate: new Date(`${currentYear}-01-01`),
        endDate: new Date(`${currentYear}-12-31`),
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: `FY ${currentYear}`,
      startDate: new Date(`${currentYear}-01-01`),
      endDate: new Date(`${currentYear}-12-31`),
      fiscalYear: currentYear,
      status: 'OPEN',
    },
  });
  console.log(`✅ Fiscal period created: FY ${currentYear}\n`);

  // 6. Create Tax Configuration
  console.log('💰 Creating tax configuration...');
  await prisma.taxConfiguration.create({
    data: {
      organizationId: organization.id,
      taxName: 'Sales Tax',
      taxType: 'SALES_TAX',
      rate: 8.5,
      description: 'Standard sales tax rate',
      isActive: true,
      effectiveFrom: new Date(`${currentYear}-01-01`),
    },
  });
  console.log(`✅ Tax configuration created\n`);

  // 7. Create Sample Customer
  console.log('👥 Creating sample customer...');
  await prisma.customer.upsert({
    where: {
      organizationId_customerNumber: {
        organizationId: organization.id,
        customerNumber: 'CUST-0001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      customerNumber: 'CUST-0001',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Corporation',
      email: 'john.doe@acme.com',
      phone: '+1234567890',
      paymentTerms: 30,
      billingAddress: {
        street: '456 Customer Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
      },
      isActive: true,
    },
  });
  console.log(`✅ Sample customer created\n`);

  // 8. Create Sample Vendor
  console.log('🏪 Creating sample vendor...');
  try {
    await prisma.vendor.create({
      data: {
        organizationId: organization.id,
        vendorNumber: 'VEND-0001',
        companyName: 'Office Supplies Inc.',
        contactName: 'Jane Smith',
        email: 'jane@officesupplies.com',
        phone: '+1234567890',
        paymentTerms: 30,
        billingAddress: {
          street: '789 Vendor Blvd',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          country: 'USA',
        },
        isActive: true,
      },
    });
    console.log(`✅ Sample vendor created\n`);
  } catch (e) {
    console.log(`ℹ️  Sample vendor already exists\n`);
  }

  // 9. Create Sample Product
  console.log('📦 Creating sample product...');
  try {
    const inventoryAccount = await prisma.chartOfAccount.findFirst({
      where: { organizationId: organization.id, code: '1300' },
    });
    const cogsAccount = await prisma.chartOfAccount.findFirst({
      where: { organizationId: organization.id, code: '5000' },
    });
    const salesAccount = await prisma.chartOfAccount.findFirst({
      where: { organizationId: organization.id, code: '4000' },
    });

    // Get the unit UnitOfMeasure
    const unitOfMeasure = await prisma.unitOfMeasure.findFirst({
      where: { organizationId: organization.id, code: 'unit' },
    });

    const product = await prisma.product.create({
      data: {
        organizationId: organization.id,
        sku: 'PROD-001',
        name: 'Standard Widget',
        description: 'A high-quality widget for all your needs',
        productType: 'INVENTORY',
        category: 'Products',
        unitOfMeasureId: unitOfMeasure?.id,
        purchasePrice: 50.00,
        sellingPrice: 100.00,
        trackInventory: true,
        reorderLevel: 10,
        reorderQuantity: 50,
        taxable: true,
        defaultTaxRate: 8.5,
        incomeAccountId: salesAccount?.id ?? undefined,
        expenseAccountId: cogsAccount?.id ?? undefined,
        assetAccountId: inventoryAccount?.id ?? undefined,
        isActive: true,
      },
    });

    // Create initial inventory
    await prisma.inventoryItem.create({
      data: {
        productId: product.id,
        warehouseLocation: 'Main Warehouse',
        quantityOnHand: 100,
        quantityAvailable: 100,
        averageCost: 50.00,
        totalValue: 5000.00,
      },
    });
    console.log(`✅ Sample product created with inventory\n`);
  } catch (e) {
    console.log(`ℹ️  Sample product already exists\n`);
  }

  // 10. Create Bank Account
  console.log('🏦 Creating bank account...');
  try {
    const checkingAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId: organization.id,
        code: '1100',
      },
    });

    if (checkingAccount) {
      await prisma.bankAccount.create({
        data: {
          organizationId: organization.id,
          accountName: 'Main Checking Account',
          accountNumber: '****1234',
          bankName: 'First National Bank',
          currency: 'USD',
          accountType: 'CHECKING',
          openingBalance: 10000.00,
          currentBalance: 10000.00,
          glAccountId: checkingAccount.id,
          isActive: true,
        },
      });
      console.log(`✅ Bank account created\n`);
    }
  } catch (e) {
    console.log(`ℹ️  Bank account already exists\n`);
  }

  // 3. Seed Units of Measure for Demo Organization
  console.log('📏 Seeding units of measure...');
  const commonUnits = [
    { code: 'unit', name: 'Unit', abbreviation: 'unit', category: 'quantity' },
    { code: 'box', name: 'Box', abbreviation: 'box', category: 'quantity' },
    { code: 'case', name: 'Case', abbreviation: 'case', category: 'quantity' },
    { code: 'pack', name: 'Pack', abbreviation: 'pack', category: 'quantity' },
    { code: 'dozen', name: 'Dozen', abbreviation: 'dz', category: 'quantity' },
    { code: 'pair', name: 'Pair', abbreviation: 'pr', category: 'quantity' },
    { code: 'set', name: 'Set', abbreviation: 'set', category: 'quantity' },
    { code: 'kg', name: 'Kilogram', abbreviation: 'kg', category: 'weight' },
    { code: 'g', name: 'Gram', abbreviation: 'g', category: 'weight' },
    { code: 'lb', name: 'Pound', abbreviation: 'lb', category: 'weight' },
    { code: 'oz', name: 'Ounce', abbreviation: 'oz', category: 'weight' },
    { code: 'metric_ton', name: 'Metric Ton', abbreviation: 't', category: 'weight' },
    { code: 'm', name: 'Meter', abbreviation: 'm', category: 'length' },
    { code: 'cm', name: 'Centimeter', abbreviation: 'cm', category: 'length' },
    { code: 'mm', name: 'Millimeter', abbreviation: 'mm', category: 'length' },
    { code: 'inch', name: 'Inch', abbreviation: 'in', category: 'length' },
    { code: 'ft', name: 'Foot', abbreviation: 'ft', category: 'length' },
    { code: 'yard', name: 'Yard', abbreviation: 'yd', category: 'length' },
    { code: 'l', name: 'Liter', abbreviation: 'L', category: 'volume' },
    { code: 'ml', name: 'Milliliter', abbreviation: 'mL', category: 'volume' },
    { code: 'gallon', name: 'Gallon (US)', abbreviation: 'gal', category: 'volume' },
    { code: 'liter_gallon', name: 'Gallon (Imperial)', abbreviation: 'gal', category: 'volume' },
    { code: 'pint', name: 'Pint', abbreviation: 'pt', category: 'volume' },
    { code: 'cup', name: 'Cup', abbreviation: 'cup', category: 'volume' },
    { code: 'tbsp', name: 'Tablespoon', abbreviation: 'tbsp', category: 'volume' },
    { code: 'tsp', name: 'Teaspoon', abbreviation: 'tsp', category: 'volume' },
    { code: 'm2', name: 'Square Meter', abbreviation: 'm²', category: 'area' },
    { code: 'ft2', name: 'Square Foot', abbreviation: 'ft²', category: 'area' },
    { code: 'acre', name: 'Acre', abbreviation: 'ac', category: 'area' },
    { code: 'hectare', name: 'Hectare', abbreviation: 'ha', category: 'area' },
    { code: 'hour', name: 'Hour', abbreviation: 'hr', category: 'time' },
    { code: 'minute', name: 'Minute', abbreviation: 'min', category: 'time' },
    { code: 'day', name: 'Day', abbreviation: 'day', category: 'time' },
  ];

  for (const unit of commonUnits) {
    await prisma.unitOfMeasure.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: unit.code,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: unit.code,
        name: unit.name,
        abbreviation: unit.abbreviation,
        category: unit.category,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${commonUnits.length} units of measure created\n`);

  console.log('✨ Database seed completed successfully!\n');
  console.log('📝 Login credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: password123');
  console.log('   Organization: demo-company\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();  });