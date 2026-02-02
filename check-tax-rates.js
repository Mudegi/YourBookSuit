const { PrismaClient } = require('./client/node_modules/@prisma/client');

// Use local database
process.env.DATABASE_URL = 'postgresql://postgres:kian256@localhost:5432/yourbooks_dev';

const prisma = new PrismaClient();

async function checkTaxRates() {
  try {
    const orgId = 'cmkr0wbeq0001vl95dodsfurp'; // Demo Company Inc.
    const taxRateId = 'cmkr4idl1000dnyqvfprv4tmd'; // The ID from the logs
    
    console.log('\n🔍 Checking tax rates for organization:', orgId);
    console.log('🎯 Looking for tax rate ID:', taxRateId);
    
    // Check TaxAgencyRate table (the correct table)
    const allTaxAgencyRates = await prisma.taxAgencyRate.findMany({
      where: { 
        taxAgency: {
          organizationId: orgId 
        }
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        rate: true,
        isActive: true,
        taxAgency: {
          select: {
            name: true,
          }
        }
      }
    });
    
    console.log('\n📊 All TaxAgencyRate records in organization:');
    console.table(allTaxAgencyRates.map(r => ({
      id: r.id,
      name: r.name,
      displayName: r.displayName,
      rate: r.rate,
      isActive: r.isActive,
      taxAgency: r.taxAgency.name,
    })));
    
    // Check specific tax rate
    const specificRate = await prisma.taxAgencyRate.findUnique({
      where: { id: taxRateId },
      include: {
        taxAgency: true,
      }
    });
    
    console.log('\n🎯 Specific TaxAgencyRate lookup result:');
    console.log(specificRate ? {
      id: specificRate.id,
      name: specificRate.name,
      rate: specificRate.rate.toString(),
      taxAgency: specificRate.taxAgency.name,
    } : 'Not found');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTaxRates();
