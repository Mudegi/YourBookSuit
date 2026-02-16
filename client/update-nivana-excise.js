/**
 * Update Nivana product with correct excise duty values
 * Run: node update-nivana-excise.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating Nivana product excise duty configuration...');

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

  // Update with correct excise values
  // LED110000 (Mineral Water) has 10% excise duty
  const updated = await prisma.product.update({
    where: {
      id: product.id,
    },
    data: {
      exciseRate: 0.1,    // 10% excise duty
      exciseRule: '1',    // By percentage
      exciseUnit: '102',  // Per litre
    },
  });

  console.log('✅ Product updated successfully!');
  console.log('  - Excise Rate:', updated.exciseRate);
  console.log('  - Excise Rule:', updated.exciseRule);
  console.log('  - Excise Unit:', updated.exciseUnit);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
