const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnit() {
  const ppUnit = await prisma.unitOfMeasure.findMany({
    where: { code: 'pp' },
    select: { id: true, code: true, name: true, abbreviation: true, category: true },
  });
  
  console.log('PP Unit:', JSON.stringify(ppUnit, null, 2));
  
  // Also check a recently created product
  const recentProducts = await prisma.product.findMany({
    where: {
      efrisRegisteredAt: { not: null },
    },
    include: {
      unitOfMeasure: true,
    },
    orderBy: {
      efrisRegisteredAt: 'desc',
    },
    take: 3,
  });
  
  console.log('\nRecent EFRIS Registered Products:');
  recentProducts.forEach(p => {
    console.log(`\n- ${p.name} (SKU: ${p.sku})`);
    console.log(`  Unit: ${p.unitOfMeasure?.name} (${p.unitOfMeasure?.abbreviation})`);
    console.log(`  Unit Code: ${p.unitOfMeasure?.code}`);
    console.log(`  EFRIS Code: ${p.efrisProductCode}`);
  });
  
  await prisma.$disconnect();
}

checkUnit().catch(console.error);
