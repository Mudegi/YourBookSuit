const { PrismaClient } = require('@prisma/client');

async function checkEfrisConfig() {
  const prisma = new PrismaClient();
  
  try {
    const org = await prisma.organization.findFirst({
      where: { slug: 'demo-company' },
      include: { eInvoiceConfig: true }
    });

    console.log('\n=== EFRIS Configuration Check ===');
    console.log('Organization:', org?.name || 'NOT FOUND');
    console.log('Org ID:', org?.id);
    console.log('Country:', org?.homeCountry);
    console.log('\nEFRIS Config:', org?.eInvoiceConfig ? 'EXISTS' : 'NOT FOUND');
    
    if (org?.eInvoiceConfig) {
      console.log('Provider:', org.eInvoiceConfig.provider);
      console.log('Active:', org.eInvoiceConfig.isActive);
      console.log('API Endpoint:', org.eInvoiceConfig.apiEndpoint);
      console.log('Has Credentials:', !!org.eInvoiceConfig.credentials);
      if (org.eInvoiceConfig.credentials) {
        const creds = org.eInvoiceConfig.credentials;
        console.log('Credential Keys:', Object.keys(creds));
      }
    }
    console.log('================================\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEfrisConfig();
