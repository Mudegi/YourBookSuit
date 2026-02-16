const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Update existing products to use official EFRIS unit codes
 * This converts products from letter codes (pp, ltr) to EFRIS codes (102, 104)
 */
async function updateProductUnits(orgSlug = 'demo-company') {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug }
    });

    if (!org) {
      console.error(`❌ Organization '${orgSlug}' not found`);
      process.exit(1);
    }

    // Get official EFRIS units
    const efrisUnits = await prisma.unitOfMeasure.findMany({
      where: {
        organizationId: org.id,
        code: { in: ['101', '102', '103', '104', '105', '106', '107', '110', '112', '113', '114', '115'] }
      }
    });

    // Create mapping from old codes to new codes
    const unitMapping = {
      // Pieces
      'pp': '102',
      'pce': '102',
      'pc': '102',
      
      // Litres
      'ltr': '104',
      'ltr2': '104',
      
      // Kilograms
      'kg': '103',
      'kgm': '103',
      'kgm2': '103',
      
      // Grams
      'grm': '103',
      
      // Meters
      'mtr': '105',
      'mtr2': '105',
      
      // Boxes/Cartons
      'bx': '101',
      
      // Dozen
      'dzn': '113',
      'dzn2': '113',
      
      // Bags
      'bg': '114',
      
      // Pairs
      'pr': '115',
    };

    console.log(`🔄 Updating products to use official EFRIS codes...\n`);

    let updated = 0;
    
    for (const [oldCode, newCode] of Object.entries(unitMapping)) {
      // Find the old unit
      const oldUnit = await prisma.unitOfMeasure.findFirst({
        where: {
          organizationId: org.id,
          code: oldCode
        }
      });

      if (!oldUnit) {
        continue;
      }

      // Find the new EFRIS unit
      const newUnit = efrisUnits.find(u => u.code === newCode);
      
      if (!newUnit) {
        console.log(`⚠️  EFRIS code ${newCode} not found for ${oldCode}, skipping...`);
        continue;
      }

      // Update all products using the old unit
      const result = await prisma.product.updateMany({
        where: {
          organizationId: org.id,
          unitOfMeasureId: oldUnit.id
        },
        data: {
          unitOfMeasureId: newUnit.id
        }
      });

      if (result.count > 0) {
        console.log(`✅ Updated ${result.count} product(s) from "${oldCode}" to "${newCode} - ${newUnit.name}"`);
        updated += result.count;
      }
    }

    console.log(`\n📊 Summary: Updated ${updated} product(s) to use official EFRIS codes`);
    
    // Show products that now use EFRIS codes
    const productsWithEfrisUnits = await prisma.product.findMany({
      where: {
        organizationId: org.id,
        unitOfMeasure: {
          code: { in: ['101', '102', '103', '104', '105', '106', '107', '110', '112', '113', '114', '115'] }
        }
      },
      include: {
        unitOfMeasure: true
      },
      take: 10
    });

    if (productsWithEfrisUnits.length > 0) {
      console.log(`\n✨ Products now using official EFRIS codes:`);
      productsWithEfrisUnits.forEach(p => {
        console.log(`  - ${p.name} (${p.sku}): ${p.unitOfMeasure?.code} - ${p.unitOfMeasure?.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const orgSlug = process.argv[2] || 'demo-company';
updateProductUnits(orgSlug);
