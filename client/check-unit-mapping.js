const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnitCodes() {
  console.log('📊 Checking unit codes in the database...\n');
  
  // Get sample of units with 3-digit codes (official EFRIS codes)
  const efrisCodeUnits = await prisma.unitOfMeasure.findMany({
    where: {
      code: {
        in: ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110']
      }
    },
    orderBy: { code: 'asc' }
  });
  
  console.log('✅ Official EFRIS 3-digit codes:');
  efrisCodeUnits.forEach(u => {
    console.log(`  ${u.code} | ${u.name.padEnd(25)} | ${u.abbreviation}`);
  });
  
  // Get sample of units with letter codes
  const letterCodeUnits = await prisma.unitOfMeasure.findMany({
    where: {
      code: {
        in: ['pp', 'ltr', 'kg', 'pc', 'pcs', 'box', 'bx', 'm', 'l', 'g']
      }
    },
    orderBy: { code: 'asc' }
  });
  
  console.log('\n📝 Letter code units (need mapping):');
  letterCodeUnits.forEach(u => {
    console.log(`  ${u.code.padEnd(5)} | ${u.name.padEnd(25)} | ${u.abbreviation}`);
  });
  
  // Count total units
  const totalUnits = await prisma.unitOfMeasure.count();
  console.log(`\n📊 Total units in database: ${totalUnits}`);
  
  await prisma.$disconnect();
}

checkUnitCodes().catch(console.error);
