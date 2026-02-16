const { PrismaClient } = require('@prisma/client');
const { seedUnitsForOrganization } = require('../prisma/seed-units');

const prisma = new PrismaClient();

/**
 * Seed units for all existing organizations that don't have units yet
 */
async function seedUnitsForAllOrganizations() {
  try {
    console.log('🏢 Finding all organizations...\n');

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    console.log(`Found ${organizations.length} organization(s)\n`);

    for (const org of organizations) {
      console.log(`\n📦 Processing: ${org.name} (${org.slug})`);
      
      // Check if organization already has units
      const existingUnits = await prisma.unitOfMeasure.count({
        where: { organizationId: org.id },
      });

      if (existingUnits > 0) {
        console.log(`  ⏭️  Skipping - already has ${existingUnits} units`);
        continue;
      }

      // Seed units for this organization
      await seedUnitsForOrganization(org.id);
    }

    console.log('\n\n✅ All organizations processed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedUnitsForAllOrganizations();
