/**
 * Sync stock for EFRIS-registered products
 * Run: node sync-efris-stock.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncStockForRegisteredProducts() {
  console.log('🔄 Syncing stock for EFRIS-registered products...\n');

  try {
    // Find all EFRIS-registered products that track inventory
    const products = await prisma.product.findMany({
      where: {
        efrisProductCode: { not: null },
        trackInventory: true,
      },
      include: {
        inventoryItems: true,
      },
    });

    console.log(`Found ${products.length} EFRIS-registered products that track inventory\n`);

    for (const product of products) {
      const stockQty = product.reorderLevel ? Number(product.reorderLevel) : 0;
      
      if (stockQty <= 0) {
        console.log(`⏭️  Skipping ${product.name} - no stock quantity (reorder level = ${stockQty})`);
        continue;
      }

      const inventory = product.inventoryItems?.[0];
      const averageCost = Number(product.purchasePrice || 0);
      const totalValue = stockQty * averageCost;

      if (inventory) {
        // Update existing inventory
        await prisma.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: stockQty,
            quantityAvailable: stockQty,
            averageCost: averageCost,
            totalValue: totalValue,
          },
        });
        console.log(`✅ Updated ${product.name}: ${stockQty} units @ ${averageCost} = ${totalValue}`);
      } else {
        // Create inventory item
        await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            warehouseLocation: 'Main',
            quantityOnHand: stockQty,
            quantityReserved: 0,
            quantityAvailable: stockQty,
            averageCost: averageCost,
            totalValue: totalValue,
          },
        });
        console.log(`✅ Created inventory for ${product.name}: ${stockQty} units`);
      }

      // Create stock movement record
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: 'ADJUSTMENT',
          quantity: stockQty,
          unitCost: averageCost,
          totalCost: totalValue,
          referenceType: 'EFRIS_SYNC',
          referenceId: `SYNC-${product.efrisProductCode}`,
          notes: `Stock sync from EFRIS registration (Product Code: ${product.efrisProductCode})`,
          movementDate: new Date(),
        },
      });
    }

    console.log(`\n✨ Done! Synced stock for ${products.length} products`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncStockForRegisteredProducts();
