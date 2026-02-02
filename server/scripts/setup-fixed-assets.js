#!/usr/bin/env node

/**
 * Quick Setup: Fixed Assets Module
 * 
 * This script helps you quickly set up the Fixed Assets module by:
 * 1. Creating asset categories with Uganda tax rates
 * 2. Optionally creating sample assets for testing
 * 
 * Usage:
 *   node scripts/setup-fixed-assets.js <organizationId> [--with-samples]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const organizationId = args[0];
const withSamples = args.includes('--with-samples');

if (!organizationId) {
  console.error('❌ Error: Organization ID is required');
  console.log('\nUsage:');
  console.log('  node scripts/setup-fixed-assets.js <organizationId> [--with-samples]');
  console.log('\nExample:');
  console.log('  node scripts/setup-fixed-assets.js org_xxx');
  console.log('  node scripts/setup-fixed-assets.js org_xxx --with-samples');
  process.exit(1);
}

async function setupFixedAssets() {
  console.log('🚀 Setting up Fixed Assets Module...\n');

  try {
    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    console.log(`✓ Organization: ${org.name} (${org.slug})\n`);

    // Check if GL accounts exist
    const accounts = await prisma.chartOfAccount.findMany({
      where: { organizationId },
      select: { id: true, accountCode: true, accountName: true },
    });

    if (accounts.length === 0) {
      throw new Error('No GL accounts found. Please set up Chart of Accounts first.');
    }

    console.log(`✓ Found ${accounts.length} GL accounts\n`);

    // Find appropriate accounts
    const findAccount = (codes, defaultName) => {
      for (const code of codes) {
        const account = accounts.find((a) => 
          a.accountCode.startsWith(code) || 
          a.accountName.toLowerCase().includes(defaultName.toLowerCase())
        );
        if (account) return account;
      }
      return accounts[0]; // Fallback
    };

    const assetAccount = findAccount(['1600', '1500', '16'], 'fixed asset');
    const depreciationAccount = findAccount(['1650', '1550', '165'], 'accumulated depreciation');
    const expenseAccount = findAccount(['6400', '6300', '64'], 'depreciation expense');

    console.log('📊 GL Account Mapping:');
    console.log(`   Asset Account: ${assetAccount.accountCode} - ${assetAccount.accountName}`);
    console.log(`   Accumulated Depreciation: ${depreciationAccount.accountCode} - ${depreciationAccount.accountName}`);
    console.log(`   Depreciation Expense: ${expenseAccount.accountCode} - ${expenseAccount.accountName}\n`);

    // Create asset categories
    console.log('📁 Creating Asset Categories...\n');

    const categories = [
      {
        name: 'Motor Vehicles',
        code: 'VEH',
        description: 'Cars, trucks, motorcycles, and other motor vehicles',
        defaultMethod: 'DECLINING_BALANCE',
        defaultLifeYears: 5,
        defaultSalvagePercent: 10,
        ugandaTaxRate: 25,
      },
      {
        name: 'Computers & Electronics',
        code: 'COMP',
        description: 'Computers, laptops, servers, printers, and electronic equipment',
        defaultMethod: 'DECLINING_BALANCE',
        defaultLifeYears: 3,
        defaultSalvagePercent: 5,
        ugandaTaxRate: 40,
      },
      {
        name: 'Plant & Machinery',
        code: 'MACH',
        description: 'Industrial machinery, equipment, and tools',
        defaultMethod: 'DECLINING_BALANCE',
        defaultLifeYears: 5,
        defaultSalvagePercent: 10,
        ugandaTaxRate: 30,
      },
      {
        name: 'Furniture & Fittings',
        code: 'FURN',
        description: 'Office furniture, fixtures, and fittings',
        defaultMethod: 'STRAIGHT_LINE',
        defaultLifeYears: 8,
        defaultSalvagePercent: 5,
        ugandaTaxRate: 20,
      },
      {
        name: 'Buildings - Commercial',
        code: 'BLDG-C',
        description: 'Commercial buildings, offices, and warehouses',
        defaultMethod: 'STRAIGHT_LINE',
        defaultLifeYears: 25,
        defaultSalvagePercent: 15,
        ugandaTaxRate: 10,
      },
      {
        name: 'Buildings - Industrial',
        code: 'BLDG-I',
        description: 'Industrial buildings and factories',
        defaultMethod: 'STRAIGHT_LINE',
        defaultLifeYears: 50,
        defaultSalvagePercent: 10,
        ugandaTaxRate: 5,
      },
      {
        name: 'Land',
        code: 'LAND',
        description: 'Land and land improvements (non-depreciable)',
        defaultMethod: 'STRAIGHT_LINE',
        defaultLifeYears: 0,
        defaultSalvagePercent: 100,
        ugandaTaxRate: 0,
      },
      {
        name: 'Leasehold Improvements',
        code: 'LEASE',
        description: 'Improvements to leased property',
        defaultMethod: 'STRAIGHT_LINE',
        defaultLifeYears: 5,
        defaultSalvagePercent: 0,
        ugandaTaxRate: 20,
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const category of categories) {
      const existing = await prisma.assetCategory.findFirst({
        where: {
          organizationId,
          code: category.code,
        },
      });

      if (existing) {
        console.log(`   ⊘ ${category.name} (${category.code}) - Already exists`);
        skippedCount++;
      } else {
        await prisma.assetCategory.create({
          data: {
            organizationId,
            assetAccountId: assetAccount.id,
            depreciationAccountId: depreciationAccount.id,
            expenseAccountId: expenseAccount.id,
            ...category,
          },
        });
        console.log(`   ✓ ${category.name} (${category.code}) - URA Rate: ${category.ugandaTaxRate}%`);
        createdCount++;
      }
    }

    console.log(`\n✓ Created ${createdCount} categories, skipped ${skippedCount} existing\n`);

    // Create sample assets if requested
    if (withSamples) {
      console.log('📦 Creating Sample Assets...\n');

      const vehicleCategory = await prisma.assetCategory.findFirst({
        where: { organizationId, code: 'VEH' },
      });

      const computerCategory = await prisma.assetCategory.findFirst({
        where: { organizationId, code: 'COMP' },
      });

      if (vehicleCategory) {
        const existing = await prisma.asset.findFirst({
          where: { organizationId, assetNumber: 'ASSET-2024-0001' },
        });

        if (!existing) {
          await prisma.asset.create({
            data: {
              organizationId,
              categoryId: vehicleCategory.id,
              assetNumber: 'ASSET-2024-0001',
              name: 'Toyota Land Cruiser V8',
              description: 'Executive company vehicle',
              purchaseDate: new Date('2024-01-15'),
              purchasePrice: 150000000,
              vendor: 'Toyota Uganda',
              depreciationMethod: 'DECLINING_BALANCE',
              usefulLifeYears: 5,
              salvageValue: 15000000,
              depreciationStartDate: new Date('2024-02-01'),
              currentBookValue: 150000000,
              accumulatedDepreciation: 0,
              status: 'ACTIVE',
              location: 'Head Office - Kampala',
              serialNumber: 'VIN123456789',
            },
          });
          console.log('   ✓ Toyota Land Cruiser V8 (ASSET-2024-0001)');
        }
      }

      if (computerCategory) {
        const existing = await prisma.asset.findFirst({
          where: { organizationId, assetNumber: 'ASSET-2024-0002' },
        });

        if (!existing) {
          await prisma.asset.create({
            data: {
              organizationId,
              categoryId: computerCategory.id,
              assetNumber: 'ASSET-2024-0002',
              name: 'Dell OptiPlex Desktops (x10)',
              description: 'Office workstations',
              purchaseDate: new Date('2024-06-01'),
              purchasePrice: 25000000,
              vendor: 'Simba Telecom',
              depreciationMethod: 'DECLINING_BALANCE',
              usefulLifeYears: 3,
              salvageValue: 1250000,
              depreciationStartDate: new Date('2024-07-01'),
              currentBookValue: 25000000,
              accumulatedDepreciation: 0,
              status: 'ACTIVE',
              location: 'Accounting Department',
            },
          });
          console.log('   ✓ Dell OptiPlex Desktops (ASSET-2024-0002)');
        }
      }

      console.log('\n✓ Sample assets created\n');
    }

    console.log('✅ Fixed Assets module setup completed!\n');
    console.log('Next steps:');
    console.log('   1. Create assets via API: POST /api/' + org.slug + '/assets');
    console.log('   2. Run monthly depreciation: POST /api/' + org.slug + '/depreciation/run-monthly');
    console.log('   3. View asset register: GET /api/' + org.slug + '/reports/assets?type=asset-register');
    console.log('\n📖 Documentation: docs/FIXED_ASSETS.md');
    console.log('🧪 API Testing Guide: docs/FIXED_ASSETS_API_TESTING.md\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupFixedAssets();
