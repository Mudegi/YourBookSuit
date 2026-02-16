const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProduct() {
  try {
    // Find HP Pavilion
    const product = await prisma.product.findFirst({
      where: { name: { contains: 'HP Pavilion' } }
    });
    
    if (!product) {
      console.log('Product not found!');
      return;
    }
    
    console.log('Current product data:');
    console.log('SKU:', product.sku);
    console.log('goodsCategoryId:', product.goodsCategoryId);
    console.log('efrisItemCode:', product.efrisItemCode);
    
    // EFRIS T124 Commodity Codes (common ones):
    // 10111301 - Computers and computer peripheral equipment and software
    // 50202310 - Non-alcoholic beverages
    // 44102906 is NOT a valid T124 code
    
    // Update with valid T124 commodity code for computers
    const validCommodityCode = '10111301'; // Computers category
    
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        goodsCategoryId: validCommodityCode, // Store valid T124 code
        // Note: We need to RE-REGISTER with EFRIS using the correct commodity_code
        efrisRegisteredAt: null, // Mark as not registered so it can be re-registered
      }
    });
    
    console.log('\n✅ Updated product:');
    console.log('goodsCategoryId:', updated.goodsCategoryId);
    console.log('efrisRegisteredAt:', updated.efrisRegisteredAt);
    console.log('\n⚠️  IMPORTANT: You must RE-REGISTER this product with EFRIS using the correct commodity code!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateProduct();
