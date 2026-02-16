const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
    include: {
      organizations: {
        include: {
          organization: true
        }
      }
    }
  });

  console.log('User found:', user ? 'YES' : 'NO');
  
  if (user) {
    console.log('Email:', user.email);
    console.log('Active:', user.isActive);
    console.log('Password Hash:', user.passwordHash);
    console.log('Organizations:', user.organizations.length);
    console.log('First Org:', user.organizations[0]?.organization?.name);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
