const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeUnits() {
  const units = await prisma.unitOfMeasure.findMany({
    where: { organization: { slug: 'demo-company' } },
    orderBy: { code: 'asc' },
    take: 30
  });
  
  console.log('Current Unit Codes in Database:');
  console.log('================================');
  units.forEach(u => {
    const code = u.code.padEnd(10);
    const name = u.name.padEnd(35);
    const abbr = (u.abbreviation || 'N/A').padEnd(10);
    console.log(`${code} | ${name} | ${abbr}`);
  });
  
  console.log(`\nTotal units: ${units.length}`);
  
  // Check which codes are EFRIS-compliant (3-digit codes)
  const efrisCompliant = units.filter(u => /^\d{3}$/.test(u.code));
  const customCodes = units.filter(u => !/^\d{3}$/.test(u.code));
  
  console.log(`\nEFRIS-compliant codes (3-digit): ${efrisCompliant.length}`);
  console.log(`Custom codes (non-3-digit): ${customCodes.length}`);
  
  if (customCodes.length > 0) {
    console.log('\nCustom codes found:');
    customCodes.slice(0, 10).forEach(u => {
      console.log(`  ${u.code} → ${u.name}`);
    });
  }
  
  await prisma.$disconnect();
}

analyzeUnits().catch(console.error);
