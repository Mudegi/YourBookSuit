const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProduct() {
  try {
    const product = await prisma.product.findFirst({
      where: { name: { contains: 'HP Pavilion' } }
    });
    
    if (!product) {
      console.log('Product not found!');
      return;
    }
    
    console.log('Before update:');
    console.log('- sku:', product.sku);
    console.log('- goodsCategoryId:', product.goodsCategoryId);
    console.log('- efrisItemCode:', product.efrisItemCode);
    
    // Update goodsCategoryId to match what was used during registration (the SKU)
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        goodsCategoryId: product.sku, // Set to the SKU that was used as commodity_code
      }
    });
    
    console.log('\n✅ After update:');
    console.log('- sku:', updated.sku);
    console.log('- goodsCategoryId:', updated.goodsCategoryId);
    console.log('- efrisItemCode:', updated.efrisItemCode);
    console.log('\nNow invoice submission should work!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProduct();
