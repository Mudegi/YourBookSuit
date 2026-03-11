/**
 * Auto-seed units of measure for a new organization.
 * Called after org creation so every org gets the standard 548 units.
 * Uses createMany with skipDuplicates for idempotency and performance.
 */
import prisma from '@/lib/prisma';

const standardUnits = [
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

export async function seedUnitsForOrganization(organizationId: string): Promise<void> {
  try {
    const allUnits = standardUnits;

    const BATCH_SIZE = 50;
    for (let i = 0; i < allUnits.length; i += BATCH_SIZE) {
      const batch = allUnits.slice(i, i + BATCH_SIZE);
      await prisma.unitOfMeasure.createMany({
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
    }

    console.log(`[seedUnits] Seeded ${allUnits.length} units for org ${organizationId}`);
  } catch (error) {
    console.error(`[seedUnits] Error seeding units for org ${organizationId}:`, error);
  }
}
