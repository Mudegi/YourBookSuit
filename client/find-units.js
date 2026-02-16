const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSpecificUnits() {
  const total = await prisma.unitOfMeasure.count({
    where: { organization: { slug: 'demo-company' } }
  });
  
  console.log('Total units:', total);
  
  // Find piece and litre related units
  const pieceOrLitre = await prisma.unitOfMeasure.findMany({
    where: {
      organization: { slug: 'demo-company' },
      OR: [
        { code: 'pp' },
        { code: '102' },
        { code: '104' },
        { name: { contains: 'Piece', mode: 'insensitive' } },
        { name: { contains: 'Litre', mode: 'insensitive' } },
        { name: { contains: 'Liter', mode: 'insensitive' } }
      ]
    }
  });
  
  console.log('\nPiece/Litre related units:');
  pieceOrLitre.forEach(u => console.log(`  ${u.code} - ${u.name} (${u.abbreviation || 'N/A'})`));
  
  // Show all units sorted by code
  const allUnits = await prisma.unitOfMeasure.findMany({
    where: { organization: { slug: 'demo-company' } },
    orderBy: { code: 'asc' }
  });
  
  console.log(`\nAll ${allUnits.length} units (first 50):`);
  allUnits.slice(0, 50).forEach(u => {
    console.log(`  ${u.code.padEnd(15)} | ${u.name.padEnd(40)} | ${u.abbreviation || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

findSpecificUnits().catch(console.error);
