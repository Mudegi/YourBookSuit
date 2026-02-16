const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSkuConstraints() {
  try {
    // Check if there are any products with the same SKU in the database
    const products = await prisma.product.findMany({
      where: {
        organization: { slug: 'demo-company' },
        sku: '44102906'
      },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
      }
    });
    
    console.log(`Products with SKU "44102906":`);
    if (products.length === 0) {
      console.log('  None found');
    } else {
      products.forEach(p => {
        console.log(`  - ${p.name} (${p.description || 'No description'})`);
      });
    }
    
    console.log(`\nTotal: ${products.length} product(s) with this SKU`);
    
    // Try to create a test product with the same SKU
    console.log('\n🧪 Testing: Can we create multiple products with same SKU?');
    
    const org = await prisma.organization.findUnique({
      where: { slug: 'demo-company' }
    });
    
    if (!org) {
      console.log('❌ Organization not found');
      await prisma.$disconnect();
      return;
    }
    
    try {
      const testProduct = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: '44102906',
          name: 'TEST - HP Laptop',
          description: 'HP II',
          productType: 'INVENTORY',
          sellingPrice: 2500000,
          purchasePrice: 2000000,
        }
      });
      
      console.log('✅ SUCCESS! Created test product with same SKU:', testProduct.name);
      
      // Clean up test product
      await prisma.product.delete({ where: { id: testProduct.id } });
      console.log('   (Test product deleted)');
      
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('❌ FAILED! Unique constraint violation on:', error.meta?.target);
        console.log('   This means SKU has a unique constraint in the database');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSkuConstraints();
