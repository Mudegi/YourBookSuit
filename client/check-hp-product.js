const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  try {
    const product = await prisma.product.findFirst({
      where: { name: { contains: 'HP Pavilion' } },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        efrisItemCode: true,
        efrisProductCode: true,
        goodsCategoryId: true,
        efrisRegisteredAt: true
      }
    });
    
    console.log('=== HP Pavilion Product Data ===');
    console.log(JSON.stringify(product, null, 2));
    
    if (product) {
      console.log('\n=== Analysis ===');
      console.log('Item Code (efrisItemCode):', product.efrisItemCode || 'NOT SET');
      console.log('Expected item_code during registration:', product.description || product.name);
      console.log('Goods Category (goodsCategoryId):', product.goodsCategoryId || 'NOT SET');
      console.log('SKU (used as commodity_code):', product.sku);
      console.log('EFRIS Registered:', product.efrisRegisteredAt ? 'YES' : 'NO');
    } else {
      console.log('Product not found!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProduct();
