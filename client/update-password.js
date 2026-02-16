const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Hash for 'password123'
  const passwordHash = '$2a$10$wbn6NXHJ5JTVkPyzrP2gt.XHKoIBUdazjWG2jbYXuVns4Za8azvWK';

  await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: {
      passwordHash: passwordHash,
      isActive: true
    }
  });

  console.log('✅ Password updated successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
