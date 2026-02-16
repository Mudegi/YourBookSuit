const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCompanyAddress() {
  try {
    // Update Demo Company with address
    const result = await prisma.organization.update({
      where: {
        slug: 'demo-company'
      },
      data: {
        address: 'Plot 123, Industrial Area, Kampala, Uganda',
        phone: '+256 700 123456',
        email: 'info@democompany.ug',
        legalName: 'Demo Company Inc.',
        taxIdNumber: '1000000000', // Replace with your actual TIN
      }
    });

    console.log('✅ Company information updated:');
    console.log('   Name:', result.name);
    console.log('   Legal Name:', result.legalName);
    console.log('   TIN:', result.taxIdNumber);
    console.log('   Address:', result.address);
    console.log('   Phone:', result.phone);
    console.log('   Email:', result.email);

  } catch (error) {
    console.error('❌ Error updating company info:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCompanyAddress();
