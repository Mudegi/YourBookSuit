const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existing) {
      console.log('✅ Demo user already exists');
      return;
    }

    // Create password hash
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        emailVerified: true
      }
    });

    console.log('✅ Demo user created:', user.email);

    // Create demo organization
    const org = await prisma.organization.create({
      data: {
        name: 'Demo Company',
        slug: 'demo-company',
        legalName: 'Demo Company LLC',
        baseCurrency: 'USD',
        homeCountry: 'US',
        onboardingCompleted: false,
        users: {
          create: {
            userId: user.id,
            role: 'ADMIN',
            isActive: true
          }
        }
      }
    });

    console.log('✅ Demo organization created:', org.name);
    console.log('');
    console.log('🎉 You can now login with:');
    console.log('   Email: admin@example.com');
    console.log('   Password: password123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
