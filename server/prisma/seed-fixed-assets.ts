/**
 * Seed: Fixed Assets Categories with Uganda Tax Rates
 * Run after organization setup to create default asset categories
 */

import { PrismaClient, DepreciationMethod } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedFixedAssetsCategories(organizationId: string) {
  console.log('Seeding Fixed Assets Categories...');

  // Get default GL accounts (assuming they exist from initial setup)
  const accounts = await prisma.chartOfAccount.findMany({
    where: { organizationId },
    select: { id: true, code: true, name: true },
  });

  // Find or create Fixed Assets accounts
  const findAccount = (codes: string[]) => {
    for (const code of codes) {
      const account = accounts.find((a) => a.code.startsWith(code));
      if (account) return account.id;
    }
    return accounts[0]?.id; // Fallback to first account
  };

  const assetAccountId = findAccount(['1600', '1500', '16']);
  const depreciationAccountId = findAccount(['1650', '1550', '165']);
  const expenseAccountId = findAccount(['6400', '6300', '64']);

  const categories = [
    {
      name: 'Motor Vehicles',
      code: 'VEH',
      description: 'Cars, trucks, motorcycles, and other motor vehicles',
      defaultMethod: 'DECLINING_BALANCE',
      defaultLifeYears: 4,
      defaultSalvagePercent: 10,
      ugandaTaxRate: 25, // 25% per URA
    },
    {
      name: 'Computers & Electronics',
      code: 'COMP',
      description: 'Computers, laptops, servers, printers, and electronic equipment',
      defaultMethod: 'DECLINING_BALANCE',
      defaultLifeYears: 3,
      defaultSalvagePercent: 5,
      ugandaTaxRate: 40, // 40% per URA
    },
    {
      name: 'Plant & Machinery',
      code: 'MACH',
      description: 'Industrial machinery, equipment, and tools',
      defaultMethod: 'DECLINING_BALANCE',
      defaultLifeYears: 5,
      defaultSalvagePercent: 10,
      ugandaTaxRate: 30, // 30% per URA
    },
    {
      name: 'Furniture & Fittings',
      code: 'FURN',
      description: 'Office furniture, fixtures, and fittings',
      defaultMethod: 'STRAIGHT_LINE',
      defaultLifeYears: 8,
      defaultSalvagePercent: 5,
      ugandaTaxRate: 20, // 20% per URA
    },
    {
      name: 'Buildings - Commercial',
      code: 'BLDG-C',
      description: 'Commercial buildings, offices, and warehouses',
      defaultMethod: 'STRAIGHT_LINE',
      defaultLifeYears: 25,
      defaultSalvagePercent: 15,
      ugandaTaxRate: 10, // 10% per URA
    },
    {
      name: 'Buildings - Industrial',
      code: 'BLDG-I',
      description: 'Industrial buildings and factories',
      defaultMethod: 'STRAIGHT_LINE',
      defaultLifeYears: 50,
      defaultSalvagePercent: 10,
      ugandaTaxRate: 5, // 5% per URA
    },
    {
      name: 'Land',
      code: 'LAND',
      description: 'Land and land improvements (non-depreciable)',
      defaultMethod: 'STRAIGHT_LINE',
      defaultLifeYears: 0,
      defaultSalvagePercent: 100,
      ugandaTaxRate: 0, // Land does not depreciate
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

  const created = [];
  for (const category of categories) {
    const existing = await prisma.assetCategory.findFirst({
      where: {
        organizationId,
        code: category.code,
      },
    });

    if (!existing) {
      const newCategory = await prisma.assetCategory.create({
        data: {
          organizationId,
          assetAccountId,
          depreciationAccountId,
          expenseAccountId,
          ...category,
          defaultMethod: category.defaultMethod as DepreciationMethod,
        },
      });
      created.push(newCategory);
      console.log(`✓ Created category: ${category.name} (${category.code})`);
    } else {
      console.log(`- Category already exists: ${category.name}`);
    }
  }

  console.log(`\n✓ Seeded ${created.length} asset categories`);
  return created;
}

// Run if called directly
if (require.main === module) {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error('Usage: tsx prisma/seed-fixed-assets.ts <organizationId>');
    process.exit(1);
  }

  seedFixedAssetsCategories(organizationId)
    .then(() => {
      console.log('✓ Fixed Assets seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding Fixed Assets:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
