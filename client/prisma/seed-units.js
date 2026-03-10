const { PrismaClient } = require('@prisma/client');
const { efrisUnits } = require('../scripts/seed-efris-units');
const prisma = new PrismaClient();

/**
 * Seed units of measure for an organization
 * This should be called when creating any new organization
 */
async function seedUnitsForOrganization(organizationId) {
  console.log(`\n📏 Seeding units for organization ${organizationId}...`);

  // Official EFRIS 3-digit codes (used in Uganda for tax compliance)
  const officialEfrisUnits = [
    { code: '101', name: 'Box', abbreviation: 'Bx', category: 'packaging' },
    { code: '102', name: 'Piece', abbreviation: 'Pc', category: 'quantity' },
    { code: '103', name: 'Kilogram', abbreviation: 'kg', category: 'weight' },
    { code: '104', name: 'Litre', abbreviation: 'L', category: 'volume' },
    { code: '105', name: 'Meter', abbreviation: 'm', category: 'length' },
    { code: '106', name: 'Tonne', abbreviation: 't', category: 'weight' },
    { code: '107', name: 'Gram', abbreviation: 'g', category: 'weight' },
    { code: '108', name: 'Cubic Meter', abbreviation: 'm³', category: 'volume' },
    { code: '109', name: 'Centimeter', abbreviation: 'cm', category: 'length' },
    { code: '110', name: 'Square Meter', abbreviation: 'm²', category: 'area' },
    { code: '111', name: 'Milliliter', abbreviation: 'mL', category: 'volume' },
    { code: '112', name: 'Pack', abbreviation: 'Pk', category: 'packaging' },
    { code: '113', name: 'Dozen', abbreviation: 'Dz', category: 'quantity' },
    { code: '114', name: 'Bag', abbreviation: 'Bg', category: 'packaging' },
    { code: '115', name: 'Pair', abbreviation: 'Pr', category: 'quantity' },
    { code: '116', name: 'Set', abbreviation: 'St', category: 'quantity' },
    { code: '117', name: 'Roll', abbreviation: 'Rl', category: 'packaging' },
    { code: '118', name: 'Bundle', abbreviation: 'Bd', category: 'packaging' },
    { code: '119', name: 'Can', abbreviation: 'Cn', category: 'packaging' },
    { code: '120', name: 'Bottle', abbreviation: 'Bt', category: 'packaging' },
  ];

  // Combine official EFRIS codes with comprehensive 528+ units from seed-efris-units.js
  const allUnits = [...officialEfrisUnits, ...efrisUnits];

  // Batch insert in chunks of 50 using createMany for performance
  const BATCH_SIZE = 50;
  let created = 0;

  for (let i = 0; i < allUnits.length; i += BATCH_SIZE) {
    const batch = allUnits.slice(i, i + BATCH_SIZE);
    try {
      const result = await prisma.unitOfMeasure.createMany({
        data: batch.map(u => ({
          organizationId,
          code: u.code,
          name: u.name,
          abbreviation: u.abbreviation,
          category: u.category,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      created += result.count;
    } catch (error) {
      console.error(`  ⚠️  Batch error at offset ${i}:`, error.message);
    }
  }

  console.log(`  ✅ Seeded: ${created} new units (${allUnits.length} total available)`);
}

// Export for use in other scripts
module.exports = { seedUnitsForOrganization };

// If run directly, seed for demo-company
if (require.main === module) {
  (async () => {
    try {
      const org = await prisma.organization.findUnique({
        where: { slug: 'demo-company' },
      });

      if (!org) {
        console.error('❌ Demo organization not found. Run main seed first.');
        process.exit(1);
      }

      await seedUnitsForOrganization(org.id);
      console.log('\n✅ Units seeded successfully!');
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
