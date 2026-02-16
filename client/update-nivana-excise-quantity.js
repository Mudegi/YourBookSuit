/**
 * Update Nivana product to use quantity-based excise (UGX 50 per litre)
 * Run: node update-nivana-excise-quantity.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating Nivana product to quantity-based excise (UGX 50 per litre)...');

  // Find the product by excise duty code
  const product = await prisma.product.findFirst({
    where: {
      exciseDutyCode: 'LED110000',
    },
  });

  if (!product) {
    console.log('❌ Product with excise code LED110000 not found');
    return;
  }

  console.log('✓ Found product:', product.name);

  // Update with correct excise values for quantity-based
  const updated = await prisma.product.update({
    where: {
      id: product.id,
    },
    data: {
      exciseRate: 50,         // UGX 50 per litre
      exciseRule: '2',        // By quantity
      exciseUnit: '102',      // Per litre
      // exciseCurrency: 'UGX', // Remove for now due to error
    },
  });

  console.log('✅ Product updated successfully!');
  console.log('  - Excise Rate:', updated.exciseRate);
  console.log('  - Excise Rule:', updated.exciseRule);
  console.log('  - Excise Unit:', updated.exciseUnit);
  console.log('  - Excise Currency:', updated.exciseCurrency);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
