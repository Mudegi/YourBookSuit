const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { seedUnitsForOrganization } = require('./seed-units');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user (password is 'password123' hashed with bcrypt)
  // This is the bcrypt hash for 'password123'
  const hashedPassword = '$2a$10$wbn6NXHJ5JTVkPyzrP2gt.XHKoIBUdazjWG2jbYXuVns4Za8azvWK';
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      id: 'cmkr0wbdr0000vl95xh8awjum',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    },
  });

  console.log('✅ Created user:', user.email);

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      id: 'cmkr0wbeq0001vl95dodsfurp',
      name: 'Demo Company Inc.',
      slug: 'demo-company',
      email: 'info@democompany.com',
      homeCountry: 'US',
      baseCurrency: 'USD',
      onboardingCompleted: true,
    },
  });

  console.log('✅ Created organization:', organization.name);

  // Link user to organization
  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });

  console.log('✅ Linked user to organization');

  // Seed units of measure for the organization
  await seedUnitsForOrganization(organization.id);

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
