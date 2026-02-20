/**
 * Seed System Admin Account
 * 
 * Run: cd client && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-system-admin.ts
 * Or:  cd client && npx tsx scripts/seed-system-admin.ts
 * 
 * This script either:
 *  1. Promotes an existing user to system admin (if email already exists)
 *  2. Creates a new system admin user + personal organization
 * 
 * Configure the admin details below:
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
// bcryptjs lives in server/node_modules – resolve from there
const bcrypt = require(path.resolve(__dirname, '../../server/node_modules/bcryptjs'));

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════
//  CONFIGURE YOUR SYSTEM ADMIN ACCOUNT HERE
// ════════════════════════════════════════════════════
const ADMIN_EMAIL = 'admin@yourbooks.app';
const ADMIN_PASSWORD = 'Admin@2026!'; // Change this!
const ADMIN_FIRST_NAME = 'System';
const ADMIN_LAST_NAME = 'Admin';
// ════════════════════════════════════════════════════

async function main() {
  console.log('🔧 Seeding System Admin account...\n');

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (user) {
    // Promote existing user
    console.log(`✅ User "${ADMIN_EMAIL}" already exists. Promoting to System Admin...`);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isSystemAdmin: true, isActive: true },
    });
    console.log(`✅ User "${user.email}" is now a System Admin.\n`);
  } else {
    // Create new admin user
    console.log(`📝 Creating new System Admin user: ${ADMIN_EMAIL}`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        isActive: true,
        isSystemAdmin: true,
        emailVerified: true,
      },
    });

    // Create a personal org for the admin (so they can also use the main system)
    const org = await prisma.organization.create({
      data: {
        name: 'YourBooks HQ',
        slug: 'yourbooks-hq',
        baseCurrency: 'USD',
        fiscalYearStart: 1,
        isActive: true,
        onboardingCompleted: true,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate: new Date(),
        approvedAt: new Date(),
        approvedById: user.id,
      },
    });

    await prisma.organizationUser.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log(`✅ System Admin created successfully!`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Organization: YourBooks HQ (yourbooks-hq)\n`);
  }

  // Also update any existing organizations that don't have subscription fields set
  const orgsWithoutTrial = await prisma.organization.findMany({
    where: { trialStartDate: null },
  });

  if (orgsWithoutTrial.length > 0) {
    console.log(`📦 Backfilling ${orgsWithoutTrial.length} organizations with trial dates...`);
    for (const org of orgsWithoutTrial) {
      const trialStart = org.createdAt || new Date();
      const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          trialStartDate: trialStart,
          trialEndDate: trialEnd,
          // If org was created more than 7 days ago, set to ACTIVE (grandfathered)
          subscriptionStatus: trialEnd < new Date() ? 'ACTIVE' : 'TRIAL',
          ...(trialEnd < new Date() ? { approvedAt: new Date(), subscriptionStartDate: trialStart } : {}),
        },
      });
    }
    console.log(`✅ Backfill complete.\n`);
  }

  console.log('🎉 System Admin setup complete!');
  console.log('   Login at: http://localhost:3000/login');
  console.log('   Admin panel: http://localhost:3000/system-admin');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
