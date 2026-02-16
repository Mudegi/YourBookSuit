const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  // Check all EFRIS registered products
  const products = await prisma.product.findMany({
    where: {
      efrisRegisteredAt: { not: null },
    },
    include: {
      unitOfMeasure: true,
    },
    orderBy: {
      efrisRegisteredAt: 'desc',
    },
  });
  
  console.log(`\nFound ${products.length} EFRIS registered products:\n`);
  
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (SKU: ${p.sku})`);
    console.log(`   Unit of Measure ID: ${p.unitOfMeasureId || 'NULL'}`);
    if (p.unitOfMeasure) {
      console.log(`   Unit: ${p.unitOfMeasure.name} (${p.unitOfMeasure.abbreviation})`);
      console.log(`   Unit Code: ${p.unitOfMeasure.code}`);
    } else {
      console.log(`   ⚠️  NO UNIT OF MEASURE SET!`);
    }
    console.log(`   EFRIS Product Code: ${p.efrisProductCode}`);
    console.log(`   EFRIS Item Code: ${p.efrisItemCode}`);
    console.log('');
  });
  
  // Count products without units
  const noUnitCount = products.filter(p => !p.unitOfMeasureId).length;
  if (noUnitCount > 0) {
    console.log(`\n⚠️  WARNING: ${noUnitCount} product(s) registered without a unit of measure!`);
  }
  
  await prisma.$disconnect();
}

checkProducts().catch(console.error);
