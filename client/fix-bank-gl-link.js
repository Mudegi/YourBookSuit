const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const banks = await p.bankAccount.findMany({
    select: { id: true, accountName: true, bankName: true, glAccountId: true, organizationId: true },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log('Current bank accounts:');
  banks.forEach(b => console.log(b.id, b.accountName, 'glAccountId:', b.glAccountId));

  if (banks.length >= 2) {
    const keep = banks[0];
    const dupe = banks[1];
    
    console.log('\nKeeping:', keep.id, keep.accountName);
    console.log('Deleting duplicate:', dupe.id, dupe.accountName);
    
    const payments = await p.payment.findMany({ where: { bankAccountId: dupe.id }, select: { id: true } });
    if (payments.length > 0) {
      console.log('Duplicate has', payments.length, 'payments - reassigning...');
      await p.payment.updateMany({ where: { bankAccountId: dupe.id }, data: { bankAccountId: keep.id } });
    }
    
    await p.bankAccount.delete({ where: { id: dupe.id } });
    console.log('Deleted duplicate.');
    
    const glAccountId = 'cmmkvz30h00013mmhug7doi3c';
    await p.bankAccount.update({ where: { id: keep.id }, data: { glAccountId } });
    console.log('Linked', keep.accountName, 'to GL 1000 (Cash and Cash Equivalents)');
  } else if (banks.length === 1 && !banks[0].glAccountId) {
    const glAccountId = 'cmmkvz30h00013mmhug7doi3c';
    await p.bankAccount.update({ where: { id: banks[0].id }, data: { glAccountId } });
    console.log('Linked', banks[0].accountName, 'to GL 1000');
  }

  const final = await p.bankAccount.findMany({
    select: { id: true, accountName: true, bankName: true, glAccountId: true }
  });
  console.log('\nFinal state:');
  final.forEach(b => console.log(JSON.stringify(b)));

  await p.$disconnect();
}
main();
