/**
 * Seed: Sample Fixed Assets
 * Creates demo assets for testing and demonstration
 */

import { PrismaClient, DepreciationMethod } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSampleAssets(organizationId: string, branchId?: string) {
  console.log('Seeding Sample Assets...');

  // Get categories
  const categories = await prisma.assetCategory.findMany({
    where: { organizationId },
  });

  if (categories.length === 0) {
    console.error('No asset categories found. Run seed-fixed-assets.ts first.');
    return [];
  }

  const vehicleCategory = categories.find((c) => c.code === 'VEH');
  const computerCategory = categories.find((c) => c.code === 'COMP');
  const furnitureCategory = categories.find((c) => c.code === 'FURN');
  const machineryCategory = categories.find((c) => c.code === 'MACH');

  const assets = [
    // Vehicles
    ...(vehicleCategory
      ? [
          {
            categoryId: vehicleCategory.id,
            name: 'Toyota Land Cruiser V8',
            description: 'Company executive vehicle',
            purchaseDate: new Date('2024-01-15'),
            purchasePrice: 150000000, // UGX 150M
            vendor: 'Toyota Uganda',
            invoiceNumber: 'TU-2024-0015',
            depreciationMethod: 'DECLINING_BALANCE',
            usefulLifeYears: 5,
            salvageValue: 15000000, // 10%
            depreciationStartDate: new Date('2024-02-01'),
            serialNumber: 'VIN123456789',
            model: 'Land Cruiser V8',
            manufacturer: 'Toyota',
            location: 'Head Office - Kampala',
          },
          {
            categoryId: vehicleCategory.id,
            name: 'Toyota Hiace Van',
            description: 'Staff transport vehicle',
            purchaseDate: new Date('2024-03-10'),
            purchasePrice: 85000000, // UGX 85M
            vendor: 'Toyota Uganda',
            invoiceNumber: 'TU-2024-0087',
            depreciationMethod: 'DECLINING_BALANCE',
            usefulLifeYears: 5,
            salvageValue: 8500000,
            depreciationStartDate: new Date('2024-04-01'),
            serialNumber: 'VIN987654321',
            model: 'Hiace',
            manufacturer: 'Toyota',
            location: 'Head Office - Kampala',
          },
        ]
      : []),

    // Computers
    ...(computerCategory
      ? [
          {
            categoryId: computerCategory.id,
            name: 'Dell OptiPlex 7090 Desktop (x10)',
            description: 'Office workstations for accounting department',
            purchaseDate: new Date('2024-06-01'),
            purchasePrice: 25000000, // UGX 25M for 10 units
            vendor: 'Simba Telecom',
            invoiceNumber: 'ST-2024-1523',
            depreciationMethod: 'DECLINING_BALANCE',
            usefulLifeYears: 3,
            salvageValue: 1250000, // 5%
            depreciationStartDate: new Date('2024-07-01'),
            serialNumber: 'BATCH-DELL-2024-001',
            model: 'OptiPlex 7090',
            manufacturer: 'Dell',
            location: 'Accounting Department',
          },
          {
            categoryId: computerCategory.id,
            name: 'HP LaserJet Pro MFP M428fdw',
            description: 'Office multi-function printer',
            purchaseDate: new Date('2024-02-20'),
            purchasePrice: 4500000, // UGX 4.5M
            vendor: 'Simba Telecom',
            invoiceNumber: 'ST-2024-0289',
            depreciationMethod: 'DECLINING_BALANCE',
            usefulLifeYears: 4,
            salvageValue: 225000,
            depreciationStartDate: new Date('2024-03-01'),
            serialNumber: 'HP-MFP-2024-001',
            model: 'LaserJet Pro MFP M428fdw',
            manufacturer: 'HP',
            location: 'Administration',
          },
        ]
      : []),

    // Furniture
    ...(furnitureCategory
      ? [
          {
            categoryId: furnitureCategory.id,
            name: 'Executive Office Furniture Set',
            description: 'CEO office furniture including desk, chairs, cabinets',
            purchaseDate: new Date('2023-11-15'),
            purchasePrice: 12000000, // UGX 12M
            vendor: 'Furniture Palace Ltd',
            invoiceNumber: 'FP-2023-0892',
            depreciationMethod: 'STRAIGHT_LINE',
            usefulLifeYears: 10,
            salvageValue: 600000,
            depreciationStartDate: new Date('2023-12-01'),
            model: 'Executive Series',
            manufacturer: 'Furniture Palace',
            location: 'Executive Wing',
          },
          {
            categoryId: furnitureCategory.id,
            name: 'Conference Room Table & Chairs',
            description: '20-seater conference table with ergonomic chairs',
            purchaseDate: new Date('2024-01-05'),
            purchasePrice: 18000000, // UGX 18M
            vendor: 'Office Solutions Uganda',
            invoiceNumber: 'OSU-2024-0012',
            depreciationMethod: 'STRAIGHT_LINE',
            usefulLifeYears: 10,
            salvageValue: 900000,
            depreciationStartDate: new Date('2024-02-01'),
            location: 'Main Conference Room',
          },
        ]
      : []),

    // Machinery
    ...(machineryCategory
      ? [
          {
            categoryId: machineryCategory.id,
            name: 'Industrial Generator 200KVA',
            description: 'Backup power generator for factory',
            purchaseDate: new Date('2023-08-10'),
            purchasePrice: 95000000, // UGX 95M
            vendor: 'PowerGen East Africa',
            invoiceNumber: 'PG-2023-0445',
            depreciationMethod: 'DECLINING_BALANCE',
            usefulLifeYears: 8,
            salvageValue: 9500000,
            depreciationStartDate: new Date('2023-09-01'),
            serialNumber: 'GEN-200KVA-2023-001',
            model: '200KVA Industrial',
            manufacturer: 'Perkins',
            location: 'Factory - Generator Room',
          },
        ]
      : []),
  ];

  const created = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const year = asset.purchaseDate.getFullYear();
    const assetNumber = `ASSET-${year}-${String(i + 1).padStart(4, '0')}`;

    const newAsset = await prisma.asset.create({
      data: {
        organizationId,
        branchId,
        assetNumber,
        currentBookValue: asset.purchasePrice, // Initial value
        accumulatedDepreciation: 0,
        status: 'ACTIVE',
        ...asset,
        depreciationMethod: asset.depreciationMethod as DepreciationMethod,
      },
    });

    created.push(newAsset);
    console.log(`✓ Created asset: ${asset.name} (${assetNumber})`);
  }

  console.log(`\n✓ Seeded ${created.length} sample assets`);
  return created;
}

// Run if called directly
if (require.main === module) {
  const organizationId = process.argv[2];
  const branchId = process.argv[3];

  if (!organizationId) {
    console.error('Usage: tsx prisma/seed-sample-assets.ts <organizationId> [branchId]');
    process.exit(1);
  }

  seedSampleAssets(organizationId, branchId)
    .then(() => {
      console.log('✓ Sample assets seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding sample assets:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
