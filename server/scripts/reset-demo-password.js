const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Create new password hash for "password123"
    const newPasswordHash = await bcrypt.hash('password123', 10);

    // Update the user
    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: {
        passwordHash: newPasswordHash,
        isActive: true
      }
    });

    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('You can now login with:');
    console.log('   Email: admin@example.com');
    console.log('   Password: password123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
