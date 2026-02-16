const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProductCodes() {
  try {
    const products = await prisma.product.findMany({
      where: {
        organization: {
          slug: 'demo-company'
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        efrisItemCode: true,
        efrisProductCode: true,
        efrisRegisteredAt: true,
      },
      take: 10
    });

    console.log('Products in Demo Company:\n');
    products.forEach(p => {
      console.log(`Product: ${p.name}`);
      console.log(`  SKU: ${p.sku}`);
      console.log(`  EFRIS Item Code: ${p.efrisItemCode || 'Not set'}`);
      console.log(`  EFRIS Product Code: ${p.efrisProductCode || 'Not registered'}`);
      console.log(`  Registered: ${p.efrisRegisteredAt ? 'Yes' : 'No'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductCodes();
