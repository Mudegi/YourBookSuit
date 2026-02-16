const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function find3DigitCodes() {
  // Find units with 3-digit codes
  const allUnits = await prisma.unitOfMeasure.findMany({
    where: { organization: { slug: 'demo-company' } },
    orderBy: { code: 'asc' }
  });
  
  const threeDigit = allUnits.filter(u => /^\d{3}$/.test(u.code));
  const twoLetter = allUnits.filter(u => /^[a-z]{2,}$/i.test(u.code));
  
  console.log(`Total units: ${allUnits.length}`);
  console.log(`3-digit codes (like 101, 102): ${threeDigit.length}`);
  console.log(`Letter codes (like pp, ltr): ${twoLetter.length}`);
  
  if (threeDigit.length > 0) {
    console.log('\n3-Digit codes found:');
    threeDigit.forEach(u => console.log(`  ${u.code} - ${u.name}`));
  } else {
    console.log('\n❌ NO 3-digit codes found in database!');
  }
  
  console.log('\nFirst 30 letter codes:');
  twoLetter.slice(0, 30).forEach(u => console.log(`  ${u.code.padEnd(10)} - ${u.name}`));
  
  await prisma.$disconnect();
}

find3DigitCodes().catch(console.error);
