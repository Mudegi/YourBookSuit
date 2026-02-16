const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function queryEfrisProduct() {
  try {
    // Get EFRIS config
    const config = await prisma.eInvoiceConfig.findFirst({
      where: { provider: 'EFRIS', isActive: true }
    });
    
    if (!config) {
      console.log('No EFRIS config found!');
      return;
    }
    
    const credentials = config.credentials;
    const apiKey = credentials.efrisApiKey || credentials.apiKey;
    
    console.log('Querying EFRIS for product "HP Pavilion"...\n');
    
    // Try to query EFRIS goods list to see what's actually registered
    const response = await fetch(`${config.apiEndpoint}/query-goods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        item_code: 'HP Pavilion', // Query by item code
      }),
    });
    
    if (!response.ok) {
      console.log('Query failed with status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }
    
    const result = await response.json();
    console.log('EFRIS Product Data:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

queryEfrisProduct();
