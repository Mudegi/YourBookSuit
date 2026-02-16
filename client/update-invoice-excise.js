/**
 * Update invoice items with correct excise duty values from products
 * Run: node update-invoice-excise.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating invoice items with excise duty from products...');

  // Find all invoice items with products that have excise duty
  const items = await prisma.invoiceItem.findMany({
    where: {
      product: {
        exciseDutyCode: {
          not: null,
        },
      },
    },
    include: {
      product: true,
      invoice: true,
    },
  });

  console.log(`Found ${items.length} invoice items with excise products`);

  for (const item of items) {
    console.log(`\nUpdating item: ${item.product.name} in invoice ${item.invoice.invoiceNumber}`);
    console.log(`  Current: exciseRate=${item.exciseRate}, exciseRule=${item.exciseRule}`);
    console.log(`  Product: exciseRate=${item.product.exciseRate}, exciseRule=${item.product.exciseRule}`);

    await prisma.invoiceItem.update({
      where: { id: item.id },
      data: {
        exciseRate: item.product.exciseRate,
        exciseRule: item.product.exciseRule,
        exciseUnit: item.product.exciseUnit,
      },
    });

    console.log(`  ✓ Updated to: exciseRate=${item.product.exciseRate}, exciseRule=${item.product.exciseRule}`);
  }

  console.log('\n✅ All invoice items updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
