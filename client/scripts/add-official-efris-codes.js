const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Add official EFRIS 3-digit unit codes to the database
 * These are the codes EFRIS actually expects according to documentation
 */
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

async function addOfficialEfrisUnits(orgSlug = 'demo-company') {
  try {
    // Get organization
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug }
    });

    if (!org) {
      console.error(`❌ Organization '${orgSlug}' not found`);
      process.exit(1);
    }

    console.log(`Adding official EFRIS codes to ${org.name}...\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const unit of officialEfrisUnits) {
      // Check if unit already exists (by code)
      const existing = await prisma.unitOfMeasure.findFirst({
        where: {
          organizationId: org.id,
          code: unit.code,
        },
      });

      if (existing) {
        // Update if exists
        await prisma.unitOfMeasure.update({
          where: { id: existing.id },
          data: {
            name: unit.name,
            abbreviation: unit.abbreviation,
            category: unit.category,
          },
        });
        console.log(`✅ Updated: ${unit.code} - ${unit.name}`);
        updated++;
      } else {
        // Create if doesn't exist
        await prisma.unitOfMeasure.create({
          data: {
            organizationId: org.id,
            code: unit.code,
            name: unit.name,
            abbreviation: unit.abbreviation,
            category: unit.category,
            isActive: true,
          },
        });
        console.log(`✨ Created: ${unit.code} - ${unit.name}`);
        created++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`\n✅ Official EFRIS units added successfully!`);
    console.log(`\nNow you can use these codes on the product form:`);
    console.log(`  - 102 for Piece (computers, phones, furniture)`);
    console.log(`  - 104 for Litre (liquids)`);
    console.log(`  - 103 for Kilogram (weight-based products)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const orgSlug = process.argv[2] || 'demo-company';
addOfficialEfrisUnits(orgSlug);
