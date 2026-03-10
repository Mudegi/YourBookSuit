const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDropdownUnits() {
  const units = await prisma.unitOfMeasure.findMany({
    where: { 
      organization: { slug: 'demo-company' },
      OR: [
        { code: '102' },
        { code: '104' },
        { code: '103' },
        { name: { contains: 'Piece'} },
        { name: { contains: 'Litre'} },
      ]
    },
    orderBy: { code: 'asc' }
  });
  
  console.log('Units that will appear when searching for "piece" or "litre":\n');
  
  const pieceUnits = units.filter(u => 
    u.name.toLowerCase().includes('piece') || u.code === '102'
  );
  const litreUnits = units.filter(u => 
    u.name.toLowerCase().includes('litre') || u.name.toLowerCase().includes('liter') || u.code === '104'
  );
  
  console.log('PIECE-related units:');
  pieceUnits.forEach(u => {
    const isOfficial = /^\d{3}$/.test(u.code) ? '⭐ OFFICIAL' : '   letter code';
    console.log(`  ${isOfficial} | ${u.code.padEnd(10)} | ${u.name}`);
  });
  
  console.log('\nLITRE-related units:');
  litreUnits.forEach(u => {
    const isOfficial = /^\d{3}$/.test(u.code) ? '⭐ OFFICIAL' : '   letter code';
    console.log(`  ${isOfficial} | ${u.code.padEnd(10)} | ${u.name}`);
  });
  
  console.log('\n💡 Recommendation:');
  console.log('   For EFRIS products, search and select the ⭐ OFFICIAL codes:');
  console.log('   - Type "102" or "piece" → Select "102 - Piece"');
  console.log('   - Type "104" or "litre" → Select "104 - Litre"');
  console.log('   - Type "103" or "kilogram" → Select "103 - Kilogram"');
  
  await prisma.$disconnect();
}

checkDropdownUnits().catch(console.error);
